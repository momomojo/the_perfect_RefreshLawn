# Shared Edge Function Utilities

**This is the CANONICAL source for shared utilities across all Supabase Edge Functions.**

## ⚠️ IMPORTANT

All Edge Functions MUST import from this directory. DO NOT create duplicate utilities elsewhere.

## Available Utilities

### `auth-utils.ts`

Authentication and authorization helpers:

- `verifyUser(req)` - Verify JWT and get authenticated user
- `isAdmin(userId)` - Check if user has admin role
- `isTechnician(userId)` - Check if user has technician role
- `getUserRole(userId)` - Get user's role from database
- `requireAdmin(req)` - Require admin role (throws if not admin)
- `getSupabaseClient()` - Get Supabase client with service role (bypasses RLS)
- `getSupabaseClientForAuth()` - Get Supabase client with anon key (respects RLS)

### `stripe-utils.ts`

Stripe integration helpers:

- `stripe` - Configured Stripe client instance
- `getSupabaseClient()` - Get Supabase client with service role
- `getStripeCustomerId(userId)` - Get customer ID from database
- `getOrCreateStripeCustomer(user, supabase)` - Get or create Stripe customer
- `formatStripeAmount(amount)` - Convert dollars to cents
- `parseStripeAmount(amount)` - Convert cents to dollars

### `http-utils.ts`

HTTP response helpers:

- `jsonResponse(data, status?)` - Create JSON response
- `errorResponse(message, status?)` - Create error response
- `successResponse(data?)` - Create success response

### `cors.ts`

CORS configuration and security headers:

- `secureHeaders` - Comprehensive security headers (CSP, HSTS, etc.)
- `corsHeaders` - CORS headers for cross-origin requests
- `handlePreflightRequest()` - Handle OPTIONS preflight requests

### `rate-limit.ts` 🔒

Rate limiting and abuse prevention:

- `checkRateLimit(identifier, config)` - Check if request should be rate limited
- `withRateLimit(config, identifierFn)` - Higher-order function to wrap handlers
- `getClientIp(req)` - Extract client IP from request headers
- `recordAuthFailure(identifier)` - Track failed auth attempts
- `isAuthBlocked(identifier)` - Check if identifier is blocked due to failures

**Pre-configured Profiles**:

- `RATE_LIMIT_PROFILES.STRIPE_WEBHOOK` - 100 req/15min per IP
- `RATE_LIMIT_PROFILES.PAYMENT_API` - 50 req/15min per user
- `RATE_LIMIT_PROFILES.AUTH_FAILURE` - 5 failures/15min per IP
- `RATE_LIMIT_PROFILES.GENERAL_API` - 100 req/min per user

## Usage Examples

### Basic Example with Auth

```typescript
import { verifyUser, isAdmin } from '../shared/auth-utils.ts';
import { stripe, getOrCreateStripeCustomer } from '../shared/stripe-utils.ts';
import { jsonResponse, errorResponse } from '../shared/http-utils.ts';
import { corsHeaders } from '../shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Verify authentication
    const user = await verifyUser(req);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    // Check admin access
    if (!(await isAdmin(user.id))) {
      return errorResponse('Forbidden', 403);
    }

    // Use Stripe utilities
    const customerId = await getOrCreateStripeCustomer(
      user,
      getSupabaseClient()
    );

    return jsonResponse({ customerId });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
});
```

### With Rate Limiting (Recommended)

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { verifyUser } from '../shared/auth-utils.ts';
import {
  withRateLimit,
  RATE_LIMIT_PROFILES,
  getClientIp,
} from '../shared/rate-limit.ts';
import {
  handleRequest,
  successResponse,
  errorResponse,
} from '../shared/http-utils.ts';

// Wrap handler with rate limiting - blocks after 50 requests per 15min
serve(
  withRateLimit(
    RATE_LIMIT_PROFILES.PAYMENT_API,
    getClientIp
  )(
    handleRequest(async (req) => {
      const user = await verifyUser(req);
      if (!user) {
        return errorResponse('Unauthorized', 401);
      }

      // Process payment logic
      const data = await processPayment(req, user);

      return successResponse({ data });
    })
  )
);
```

### Manual Rate Limiting Check

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import {
  checkRateLimit,
  RATE_LIMIT_PROFILES,
  getClientIp,
} from '../shared/rate-limit.ts';
import { errorResponse, successResponse } from '../shared/http-utils.ts';

serve(async (req) => {
  const ip = getClientIp(req);

  // Check rate limit manually
  const rateLimitResult = await checkRateLimit(
    ip,
    RATE_LIMIT_PROFILES.STRIPE_WEBHOOK
  );

  if (!rateLimitResult.allowed) {
    return errorResponse(
      `Rate limit exceeded. Try again in ${Math.ceil(rateLimitResult.resetIn / 1000)}s`,
      429,
      { 'Retry-After': String(Math.ceil(rateLimitResult.resetIn / 1000)) }
    );
  }

  // Process webhook
  return successResponse({ received: true });
});
```

### Auth Failure Tracking

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import {
  recordAuthFailure,
  isAuthBlocked,
  getClientIp,
} from '../shared/rate-limit.ts';
import { errorResponse, successResponse } from '../shared/http-utils.ts';

serve(async (req) => {
  const ip = getClientIp(req);

  // Check if IP is blocked due to too many failures
  if (await isAuthBlocked(ip)) {
    return errorResponse(
      'Too many failed authentication attempts. Try again later.',
      429
    );
  }

  const { email, password } = await req.json();
  const authResult = await attemptLogin(email, password);

  if (!authResult.success) {
    // Record the failure
    await recordAuthFailure(ip);
    return errorResponse('Invalid credentials', 401);
  }

  return successResponse({ token: authResult.token });
});
```

## Migration Status

### ✅ Consolidated Files

- `auth-utils.ts` - Enhanced with role checking and admin helpers
- `stripe-utils.ts` - Enhanced with amount formatting utilities

### ⚠️ Deprecated Directories (TO BE REMOVED)

- `supabase/functions/_shared/` - OLD, do not use
- `supabase/functions/stripe-payment-api/functions/shared/` - OLD, do not use

### 📋 Edge Functions to Update

The following Edge Functions need to be updated to import from this canonical directory:

1. ✅ `stripe-payment-api` - Update imports
2. ⏳ `stripe-webhook` - Update imports
3. ⏳ `stripe-customer-api` - Update imports
4. ⏳ `stripe-admin-api` - Update imports
5. ⏳ `stripe-api` - Update imports
6. ⏳ `stripe-subscription-api` - Update imports
7. ⏳ `stripe-refund` - Update imports
8. ⏳ `send-push-notification` - Update imports
9. ⏳ `send-job-report-email` - Update imports

## Best Practices

1. **Single Source of Truth**: Always import from `../shared/` - never duplicate code
2. **Type Safety**: All utilities include TypeScript types and JSDoc comments
3. **Error Handling**: All utilities log errors with prefixes like `[Auth]`, `[Stripe]`
4. **Environment Validation**: Critical env vars are validated at module load
5. **Consistent Logging**: Use structured logging with context prefixes

## Adding New Utilities

When adding new shared utilities:

1. Create a new file in this directory
2. Add proper TypeScript types and JSDoc comments
3. Export functions explicitly (don't use `export *`)
4. Add logging with appropriate prefixes
5. Update this README with usage examples
6. Test in at least one Edge Function before using elsewhere

## Security Notes

- **Service Role Key**: Used in `getSupabaseClient()` - bypasses RLS, use carefully
- **Anon Key**: Used in `getSupabaseClientForAuth()` - respects RLS, use for user operations
- **JWT Verification**: Always verify JWTs before accessing user data
- **Role Checks**: Always check roles before allowing admin/technician operations
