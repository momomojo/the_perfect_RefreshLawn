# Edge Function Migration Guide

## 🎯 Goal: Consolidate Duplicate Shared Utilities

**Status**: ✅ Canonical utilities created | ⏳ Migration in progress

## Problem Statement

We discovered **3 duplicate copies** of shared utilities across Edge Functions:

- `supabase/functions/shared/` ✅ **CANONICAL (use this)**
- `supabase/functions/_shared/` ❌ **DEPRECATED**
- `supabase/functions/stripe-payment-api/functions/shared/` ❌ **DEPRECATED**

This creates:

- **Security Risk**: Inconsistent implementations, difficult to patch vulnerabilities
- **Maintenance Burden**: Changes must be applied in multiple places
- **Code Drift**: Functions may behave differently due to version mismatches

## Solution: Canonical Shared Utilities

### ✅ What's Been Done

1. **Created Enhanced Canonical Utilities** (`supabase/functions/shared/`)
   - `auth-utils.ts` - Enhanced with role checking, admin helpers, TypeScript types
   - `stripe-utils.ts` - Enhanced with amount formatting, better error messages
   - `http-utils.ts` - Response builders for JSON, errors, success
   - `cors.ts` - CORS headers configuration
   - `README.md` - Comprehensive documentation

2. **Features Added**:
   - ✅ TypeScript types and JSDoc comments
   - ✅ Structured logging with context prefixes (`[Auth]`, `[Stripe]`)
   - ✅ Environment variable validation
   - ✅ Additional helper functions (`isTechnician`, `requireAdmin`, `formatStripeAmount`)

## 📋 Migration Checklist

### Edge Functions to Migrate

| Function                  | Status   | Priority | Notes                                             |
| ------------------------- | -------- | -------- | ------------------------------------------------- |
| `stripe-webhook`          | ⏳ To Do | P0       | Inline Stripe init, critical payment flow         |
| `stripe-payment-api`      | ⏳ To Do | P0       | Uses nested `functions/shared/`, payment creation |
| `stripe-customer-api`     | ⏳ To Do | P1       | Customer management                               |
| `stripe-admin-api`        | ⏳ To Do | P1       | Admin operations                                  |
| `stripe-api`              | ⏳ To Do | P2       | General Stripe operations                         |
| `stripe-subscription-api` | ⏳ To Do | P2       | Subscription management                           |
| `stripe-refund`           | ⏳ To Do | P1       | Refund processing                                 |
| `send-push-notification`  | ⏳ To Do | P2       | Push notifications                                |
| `send-job-report-email`   | ⏳ To Do | P2       | Email reports                                     |

## 🔧 Migration Steps (Per Function)

### Step 1: Update Imports

**Before:**

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import Stripe from 'https://esm.sh/stripe@12.4.0?dts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);
```

**After:**

```typescript
import {
  stripe,
  getSupabaseClient,
  getStripeCustomerId,
} from '../shared/stripe-utils.ts';
import { verifyUser, isAdmin } from '../shared/auth-utils.ts';
import { jsonResponse, errorResponse } from '../shared/http-utils.ts';
import { corsHeaders } from '../shared/cors.ts';
```

### Step 2: Replace Inline Implementations

**Before:**

```typescript
// Get the JWT token from the request
const authHeader = req.headers.get('Authorization') || '';
const token = authHeader.replace('Bearer ', '');

if (!token) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 401,
  });
}

const {
  data: { user },
  error,
} = await supabase.auth.getUser(token);
```

**After:**

```typescript
const user = await verifyUser(req);
if (!user) {
  return errorResponse('Unauthorized', 401);
}
```

### Step 3: Test Function

```bash
# Deploy to test environment
supabase functions deploy <function-name> --project-ref <test-ref>

# Test with curl or Playwright
curl -X POST https://<project-ref>.supabase.co/functions/v1/<function-name> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Step 4: Delete Deprecated Directories (After All Migrations)

```bash
# Only after ALL functions are migrated and tested!
rm -rf supabase/functions/_shared
rm -rf supabase/functions/stripe-payment-api/functions/shared
```

## 📖 Example Migration: stripe-webhook

### Before

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import Stripe from 'https://esm.sh/stripe@12.4.0?dts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
      },
      status: 204,
    });
  }

  // ... webhook handling
});
```

### After

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { stripe, getSupabaseClient } from '../shared/stripe-utils.ts';
import { jsonResponse, errorResponse } from '../shared/http-utils.ts';
import { corsHeaders } from '../shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  const supabase = getSupabaseClient();
  // ... webhook handling with imported stripe client
});
```

## 🧪 Testing Checklist

After migrating each function:

- [ ] Function deploys without errors
- [ ] Environment variables are accessible
- [ ] Stripe operations work (create customer, payment intent, etc.)
- [ ] Authentication works (JWT verification)
- [ ] Database operations work (queries, updates)
- [ ] Error responses are formatted correctly
- [ ] CORS headers are applied
- [ ] Existing tests pass (if any)
- [ ] Manual smoke test with real requests

## ⚠️ Common Pitfalls

1. **Relative Path Errors**: Use `../shared/` not `./shared/` or `/shared/`
2. **Import Order**: Import from shared utilities before using them
3. **Type Mismatches**: Ensure TypeScript types match (User, Stripe objects)
4. **Environment Vars**: Shared utilities validate env vars - check logs if failing
5. **Supabase Client**: Use `getSupabaseClient()` consistently, don't create new instances

## 📊 Benefits After Migration

- ✅ **Security**: Single point to patch vulnerabilities
- ✅ **Maintainability**: Update once, fix everywhere
- ✅ **Type Safety**: Full TypeScript types across all functions
- ✅ **Consistency**: All functions behave identically
- ✅ **Code Reduction**: ~50-100 lines removed per function
- ✅ **Testability**: Shared utilities can be unit tested once

## 🚀 Next Steps

1. **Week 1**: Migrate P0 functions (stripe-webhook, stripe-payment-api)
2. **Week 2**: Migrate P1 functions (stripe-customer-api, stripe-refund, stripe-admin-api)
3. **Week 3**: Migrate P2 functions (remaining Stripe and utility functions)
4. **Week 4**: Delete deprecated directories, update documentation

## 📞 Need Help?

- **Documentation**: See `supabase/functions/shared/README.md`
- **Examples**: Look at any migrated function
- **Types**: All utilities include TypeScript types and JSDoc
- **Testing**: Use local Supabase CLI for development testing

---

**Last Updated**: 2025-01-21
**Author**: Code quality improvement initiative
**Status**: Migration in progress - 0/9 functions completed
