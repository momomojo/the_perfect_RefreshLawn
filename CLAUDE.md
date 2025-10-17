# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RefreshLawn is a lawn care service management SaaS application built with React Native (Expo) for cross-platform mobile and web support, with Supabase as the backend and Stripe for payments.

## Tech Stack

- **Frontend**: React Native (Expo managed workflow) with TypeScript
- **UI**: NativeWind (TailwindCSS for React Native), NativeBase components
- **State Management**: Zustand for global state, React Context for auth
- **Backend**: Supabase (PostgreSQL database, Auth, Storage, Edge Functions, Real-time)
- **Payments**: Stripe (native implementation for iOS/Android, web implementation for browsers)
- **Push Notifications**: Expo Notifications

## Development Commands

### Starting the App

```bash
# Start with auto Supabase management
npm start                    # Starts Expo dev server, auto-starts Supabase if needed

# Platform-specific starts
npm run android              # Launch on Android
npm run ios                  # Launch on iOS
npm run web                  # Launch in browser

# Supabase control
npm run supabase:start       # Manually start local Supabase
npm run supabase:stop        # Stop local Supabase
npm run supabase:status      # Check Supabase status
npm run supabase:restart     # Restart Supabase
```

### Development Utilities

```bash
npm run validate-env         # Validate environment variables are properly configured
npm test                     # Run Jest tests in watch mode
npm run lint                 # Run Expo linter
npm run reset-project        # Move starter code to app-example/ for fresh start
```

### Building

```bash
npx expo prebuild            # Generate native iOS/Android code (required before native builds)
npx eas build                # Build with Expo Application Services (requires eas.json config)
```

## Architecture

### Role-Based Access Control (RBAC)

The app has three distinct user roles with separate navigation stacks:

- **Customer**: Book services, view history, manage payment methods (`app/(customer)/`)
- **Technician**: View assigned jobs, update status, upload before/after photos (`app/(technician)/`)
- **Admin**: Dashboard, user management, service management, billing hub (`app/(admin)/` and `app/(admin_stack)/`)

Role enforcement happens at multiple layers:
- **Frontend**: RoleGuard component (`app/components/auth/RoleGuard.tsx`) and ProtectedRoute
- **Backend**: PostgreSQL Row-Level Security (RLS) policies in Supabase
- **JWT**: Custom claims added via database hooks (`supabase/migrations/*_jwt_custom_hook.sql`)

### Authentication Flow

Authentication is managed via Supabase Auth with a custom context provider:

1. **Provider**: `lib/auth.tsx` exports `AuthProvider` and `useAuth()` hook
2. **Session Persistence**: Uses AsyncStorage (dev) or SecureStore (prod) - configured in `lib/supabase.ts`
3. **Auto-refresh**: JWT tokens auto-refresh via Supabase client config
4. **Logout**: Must use `lib/auth.tsx` logout function to properly clear session across all storage mechanisms

**IMPORTANT**: There is only ONE Supabase client initialization in `lib/supabase.ts`. Never create multiple clients to avoid auth conflicts.

### Payment Implementation

Stripe payments are platform-aware with distinct implementations:

- **Web**: Uses `@stripe/react-stripe-js` with Stripe Elements (`components/payment/StripePaymentWeb.tsx`)
- **Native** (iOS/Android): Uses `@stripe/stripe-react-native` with PaymentSheet (`components/payment/StripePaymentNative.tsx`)
- **Unified Component**: `components/payment/StripePayment.tsx` detects platform and routes to correct implementation

Payment flow:
1. Customer creates booking
2. Backend edge function (`supabase/functions/stripe-payment-api/`) creates PaymentIntent with ephemeral key
3. Frontend presents Stripe UI (web: PaymentElement, native: PaymentSheet)
4. On success, booking status updates to `payment_confirmed`
5. Webhooks (`supabase/functions/stripe-webhook/`) handle async payment events

See `STRIPE_NATIVE_IMPLEMENTATION.md` for complete payment architecture details.

### Database Schema & Migrations

The database schema is defined entirely in SQL migrations under `supabase/migrations/`. Key tables:

- `profiles` - User profiles with role-based info
- `services` - Available lawn care services
- `bookings` - Service appointments (core entity)
- `reviews` - Customer ratings for technicians
- `notifications` - User notifications
- `payment_methods` - Saved Stripe payment methods
- `customers`, `payments`, `subscriptions`, `invoices` - Stripe-related tables

**Migration Workflow**:
1. Migrations run in timestamp order (filename: `YYYYMMDDHHMMSS_description.sql`)
2. Important migrations handle: RLS policies, custom JWT claims, triggers, stored procedures
3. When modifying schema, always create a new migration file - never edit existing ones
4. Test migrations locally with Supabase CLI before applying to remote

### Real-time Subscriptions

Real-time features are implemented using Supabase's PostgreSQL real-time via `lib/data.ts`:

- `subscribeToBookings()` - Live booking updates filtered by customer/technician
- `subscribeToProfiles()` - Profile changes (for admin dashboards)
- `subscribeToReviews()` - Review notifications
- `subscribeToNotifications()` - Push notification delivery

Always unsubscribe using `unsubscribeFromChannel()` in cleanup (useEffect return).

### File & Folder Structure

```
app/
  (admin)/               # Admin-only screens
  (admin_stack)/         # Secondary admin nav (billing hub, invoices, customers)
  (customer)/            # Customer screens
  (technician)/          # Technician screens
  (auth)/                # Login, register, password reset
  components/            # Shared React components
    admin/               # Admin-specific components
    auth/                # Auth-related components
    common/              # Shared across roles
    customer/            # Customer-specific components
    technician/          # Technician-specific components
    testing/             # Supabase test utilities
  _layout.tsx            # Root layout with providers
  index.tsx              # Entry point / login screen

lib/
  auth.tsx               # Auth context & hooks
  data.ts                # Database query functions & types
  supabase.ts            # Supabase client initialization (SINGLETON)
  stripe-provider.tsx    # Platform-aware Stripe provider
  env-validation.ts      # Environment variable validation
  notification.ts        # Push notification utilities
  confirmation.tsx       # Confirmation modal context

components/
  payment/               # Stripe payment components (web + native)

supabase/
  migrations/            # SQL migration files
  functions/             # Edge functions (Deno/TypeScript)
    stripe-api/          # Main Stripe operations
    stripe-payment-api/  # Payment intent creation
    stripe-customer-api/ # Customer & setup intent operations
    stripe-webhook/      # Stripe webhook handler
    shared/              # Shared utilities for edge functions
```

### Environment Configuration

Environment variables are validated at app startup using `lib/env-validation.ts`. Required variables:

```
EXPO_PUBLIC_SUPABASE_URL           # Supabase project URL
EXPO_PUBLIC_SUPABASE_ANON_KEY      # Supabase anonymous key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY # Stripe publishable key (pk_test_* or pk_live_*)
```

**Important**:
- All client-side variables must be prefixed with `EXPO_PUBLIC_`
- Run `npm run validate-env` to check configuration
- Never commit `.env` file to version control
- See `ENVIRONMENT_SETUP.md` for detailed setup instructions

### Supabase Edge Functions

Edge functions are Deno-based serverless functions in `supabase/functions/`:

**Shared Utilities** (`supabase/functions/shared/`):
- `stripe-utils.ts` - Stripe client initialization and helpers
- `auth-utils.ts` - JWT validation and user extraction
- `cors.ts` - CORS header management
- `http-utils.ts` - HTTP response builders

**Deployment**:
```bash
# Deploy single function
supabase functions deploy stripe-webhook

# Deploy all functions
supabase functions deploy
```

**Important**: Edge functions use `SET search_path = public, extensions;` for security. All database references must be schema-qualified.

### Coding Preferences (from Cursor rules)

- **Simplicity First**: Always prefer simple solutions over complex patterns
- **DRY**: Check for existing similar code before duplicating functionality
- **Environment-Aware**: Write code that works across dev, test, and prod environments
- **Minimal Changes**: Only make changes directly related to the task at hand
- **Pattern Consistency**: When fixing bugs, exhaust options with existing patterns before introducing new technologies
- **Clean Codebase**: Keep organized, remove old implementations when replacing patterns
- **No One-Time Scripts**: Avoid script files that only run once
- **File Size**: Refactor files over 200-300 lines of code
- **No Mocking in Dev/Prod**: Mock data only for tests, never in dev or prod environments
- **Protect .env**: Never overwrite `.env` file without explicit confirmation
- **Focused Changes**: Do not modify code unrelated to the task
- **Thorough Tests**: Write comprehensive tests for major functionality
- **Avoid Destructive Refactors**: Don't make major architectural changes to working features unless explicitly requested

### Testing

Jest is configured with `@testing-library/react-native`. Test files should be co-located with components.

**Important Test Utilities**:
- `app/supabase-test-hub.tsx` - In-app Supabase feature testing UI
- `app/debug-tools.tsx` - JWT debugger and role tester
- `app/components/testing/` - Test utilities for Supabase integration

Run tests with `npm test` (watch mode).

### Database Optimization

The database includes performance optimizations:

**Indexes** (see `supabase/migrations/20250408212245_add_single_column_indexes.sql`):
- Composite indexes on `bookings` table for common query patterns (customer+status, technician+date)
- Single-column indexes on frequently filtered fields (status, role)

**Stored Procedures**:
- `get_dashboard_metrics()` - Batch query for admin dashboard
- `update_booking_status()` - Status updates with automatic notifications
- `assign_booking_technician()` - Technician assignment with RLS-safe operations

**Pagination**:
- Offset-based pagination for simple lists (`getCustomerBookings`)
- Cursor-based pagination for large datasets (`getCustomerBookingsCursor`)

**Retry Logic**: `lib/queryWithRetry.ts` provides automatic retry for transient Supabase failures with exponential backoff.

### Known Patterns & Conventions

1. **Platform Detection**: Use `Platform.OS` to branch web vs. native logic (see `lib/stripe-provider.tsx`, `lib/notification.ts`)
2. **Toast Notifications**: Use `react-native-toast-message` for cross-platform alerts (NOT `Alert.alert` which is mobile-only)
3. **Image Uploads**: Use Expo ImagePicker → Supabase Storage → store public URL in database
4. **Booking Status Flow**: `pending_payment` → `payment_processing` → `payment_confirmed` → `scheduled` → `in_progress` → `completed`
5. **RLS Bypass**: Admin operations use stored procedures with `SECURITY DEFINER` to bypass RLS when needed
6. **TypeScript**: Strict mode enabled, types defined in `lib/data.ts`

### Important Documentation Files

- `README.md` - Setup instructions, database optimizations
- `STRIPE_NATIVE_IMPLEMENTATION.md` - Complete Stripe integration guide
- `ENVIRONMENT_SETUP.md` - Environment variable configuration
- `SUPABASE_CUSTOM_CLAIMS_README.md` - JWT custom claims implementation
- `LOGOUT-FIX-INSTRUCTIONS.md` - Auth session cleanup guide
- `storage-setup.md` - Supabase Storage bucket configuration

## Common Gotchas

1. **Multiple Supabase Clients**: Never create additional Supabase client instances - always import from `lib/supabase.ts`
2. **Auth Storage**: Session persistence uses different storage adapters (AsyncStorage vs SecureStore) - logout must clear both
3. **JWT Role Claims**: Roles are stored in `auth.users.raw_user_meta_data.role` AND `profiles.role` - keep in sync
4. **RLS Policies**: Changes to RLS policies require migration files - test with different user roles
5. **Edge Function Search Path**: Always set `search_path` in function definitions for security
6. **Stripe Keys**: Publishable keys (pk_*) are client-safe; secret keys (sk_*) only in edge functions
7. **Platform-Specific Code**: Stripe payment flow differs between web and native - use unified component wrappers
8. **Migration Order**: Migrations run alphabetically by filename - use timestamp prefixes
9. **Booking Images**: Before/after photos stored in Supabase Storage `booking-images` bucket with RLS policies
10. **Notification Types**: Must match enum constraint in database - see `lib/data.ts` Notification type definition
11. **Payment Testing Workflow**: When testing payments, always verify: (1) booking was inserted correctly in database using Supabase MCP, and check edge function invocation logs via Supabase CLI/MCP; (2) Stripe webhook event logs via Stripe CLI/MCP to confirm all edge functions executed successfully
