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

### Log Monitoring System

A comprehensive logging system captures Supabase Edge Function logs and Stripe webhook payloads for debugging and analysis.

**Quick Start:**

```bash
npm run logs:launch    # Auto-opens 3 terminals: webhook receiver, Stripe forwarding, production logs

Configuration:
- Project ref auto-loaded from .env.logs (already configured: iqxdatlqgvdcvyfdxywf)
- No manual setup required

Individual Commands:
npm run logs:prod      # Tail all Edge Functions
npm run logs:webhook   # Tail stripe-webhook function only
npm run logs:payment   # Tail stripe-payment-api function only
npm run logs:receiver  # Start local webhook receiver (port 8787)

Log Files:
- Production: logs/production/*.ndjson - Edge Function invocations and console output
- Development: logs/development/webhooks.ndjson - Local webhook payloads
- Format: NDJSON (newline-delimited JSON)

Claude Code Integration:
Claude can directly read and analyze log files. Ask Claude to:
- "Show me recent webhook errors from logs/production/stripe-webhook.ndjson"
- "Find all payment_intent.succeeded events in the last hour"
- "Analyze why booking creation failed for payment intent pi_xxx"
- "Compare webhook timing between successful and failed bookings"

Detailed Documentation:
See scripts/logs/README.md for:
- Complete setup instructions
- Troubleshooting guide
- Advanced usage examples
- Platform-specific launcher details
- Log filtering and analysis techniques

### File & Folder Structure

```

app/
(admin)/ # Admin-only screens
(admin_stack)/ # Secondary admin nav (billing hub, invoices, customers)
(customer)/ # Customer screens
(technician)/ # Technician screens
(auth)/ # Login, register, password reset
components/ # Shared React components
admin/ # Admin-specific components
auth/ # Auth-related components
common/ # Shared across roles
customer/ # Customer-specific components
technician/ # Technician-specific components
testing/ # Supabase test utilities
\_layout.tsx # Root layout with providers
index.tsx # Entry point / login screen

lib/
auth.tsx # Auth context & hooks
data.ts # Database query functions & types
supabase.ts # Supabase client initialization (SINGLETON)
stripe-provider.tsx # Platform-aware Stripe provider
env-validation.ts # Environment variable validation
notification.ts # Push notification utilities
confirmation.tsx # Confirmation modal context

components/
payment/ # Stripe payment components (web + native)

supabase/
migrations/ # SQL migration files
functions/ # Edge functions (Deno/TypeScript)
stripe-api/ # Main Stripe operations
stripe-payment-api/ # Payment intent creation
stripe-customer-api/ # Customer & setup intent operations
stripe-webhook/ # Stripe webhook handler
shared/ # Shared utilities for edge functions

```

### Environment Configuration

Environment variables are validated at app startup using `lib/env-validation.ts`. Required variables:

```

EXPO*PUBLIC_SUPABASE_URL # Supabase project URL
EXPO_PUBLIC_SUPABASE_ANON_KEY # Supabase anonymous key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY # Stripe publishable key (pk_test*_ or pk*live*_)

````

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
````

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
- `PRODUCTION_CHECKLIST.md` - Pre-deployment checklist
- `MONITORING.md` - Production monitoring guide

## Production Features

### Crash Reporting & Monitoring

RefreshLawn uses **Sentry** for production error tracking and performance monitoring.

**Configuration**:

- Sentry Project: `mohib-hafeez/refreshlawn`
- DSN: Auto-configured in `lib/sentry.ts`
- Dashboard: https://mohib-hafeez.sentry.io/projects/refreshlawn/

**Key Files**:

- `lib/sentry.ts` - Sentry initialization and utilities
- `lib/performance-monitor.ts` - Business flow tracking (booking, payment, technician workflows)

**Usage**:

```typescript
import { captureException, addBreadcrumb, setSentryUser } from '../lib/sentry';
import { BookingFlowMonitor } from '../lib/performance-monitor';

// Track user (call after authentication)
setSentryUser({ id: user.id, email: user.email, role: user.role });

// Add context breadcrumb
addBreadcrumb('User clicked book service', 'user');

// Capture exception
captureException(error, { context });

// Monitor critical flows
const monitor = new BookingFlowMonitor();
monitor.start();
// ... booking steps
monitor.success(bookingId);
```

**Sentry Features**:

- Automatic crash reporting (iOS, Android, Web)
- Performance monitoring for user flows
- Error context with breadcrumbs and stack traces
- Release tracking with source maps
- User feedback collection

### CI/CD Pipeline

Automated quality checks via GitHub Actions (`.github/workflows/`):

**Workflows**:

- `ci.yml` - Linting, unit tests, E2E tests, security scanning
- `eas-build.yml` - Automated EAS builds on push to main
- `dependabot.yml` - Automated dependency updates

**Local Commands**:

```bash
npm run lint           # ESLint checks
npm run test:ci        # Jest with coverage
npm run test:e2e       # Playwright E2E tests
npm run format:check   # Prettier formatting
```

**Status Badges**: See README.md for CI/CD status

### Over-the-Air (OTA) Updates

EAS Update enables instant JS/asset updates without app store review.

**Channels**:

- `development` - Dev builds
- `staging` - Internal testing (preview profile)
- `production` - Live users (production profile)

**Publishing Updates**:

```bash
# Staging
npm run update:staging "Fix booking bug"

# Production (requires confirmation)
npm run update:prod "Critical payment fix"
```

**Configuration**:

- `eas.json` - Build profiles with channels
- `app.config.js` - Runtime version and update URL

**When to Use**:

- ✅ JavaScript bug fixes
- ✅ UI/styling changes
- ✅ Asset updates
- ❌ Native code changes (requires new build)

### Pre-commit Hooks

Husky + lint-staged enforce code quality:

**On Every Commit**:

- Prettier auto-formatting
- ESLint auto-fixes
- Runs only on staged files

**Configuration**: `.husky/pre-commit` + `package.json` lint-staged

### EAS Build Profiles

**Development**:

- Development client
- Internal distribution
- Channel: development

**Preview** (`eas build --profile preview`):

- TestFlight/Internal Testing
- Channel: staging

**Production** (`eas build --profile production`):

- App Store/Play Store
- Auto-increment versioning
- Channel: production

## Production Deployment

### Pre-deployment

**MUST REVIEW**: `PRODUCTION_CHECKLIST.md` before deploying.

**Key Checks**:

1. All environment variables in EAS secrets
2. Tests passing (`npm run test:ci`, `npm run test:e2e`)
3. Supabase migrations applied and Edge Functions deployed
4. Stripe webhook registered and tested
5. Sentry configured with source maps uploading

### Deployment

```bash
# Build for app stores
eas build --platform all --profile production

# Publish OTA update
npm run update:prod "Release notes"

# Deploy Edge Functions
supabase functions deploy --project-ref YOUR_REF
```

### Post-deployment

**First 24 Hours**:

- Monitor Sentry for error spikes
- Check Stripe webhook success rate
- Verify OTA update delivery

**Ongoing**: See `MONITORING.md`

### Rollback

**OTA Rollback**:

```bash
npm run update:prod "Rollback to v1.0.0"
```

**Native Rollback**: Revert → hotfix → expedited app store review

## Common Gotchas

1. **Multiple Supabase Clients**: Never create additional Supabase client instances - always import from `lib/supabase.ts`
2. **Auth Storage**: Session persistence uses different storage adapters (AsyncStorage vs SecureStore) - logout must clear both
3. **JWT Role Claims**: Roles are stored in `auth.users.raw_user_meta_data.role` AND `profiles.role` - keep in sync
4. **RLS Policies**: Changes to RLS policies require migration files - test with different user roles
5. **Edge Function Search Path**: Always set `search_path` in function definitions for security
6. **Stripe Keys**: Publishable keys (pk*\*) are client-safe; secret keys (sk*\*) only in edge functions
7. **Platform-Specific Code**: Stripe payment flow differs between web and native - use unified component wrappers
8. **Migration Order**: Migrations run alphabetically by filename - use timestamp prefixes
9. **Booking Images**: Before/after photos stored in Supabase Storage `booking-images` bucket with RLS policies
10. **Notification Types**: Must match enum constraint in database - see `lib/data.ts` Notification type definition

- we are not using local supabase, use supabase mcp or cli when needing to interact with backend, query, or apply specific migrations using supabase mcp
