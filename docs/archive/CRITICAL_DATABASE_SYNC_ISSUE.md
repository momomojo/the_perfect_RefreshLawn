# CRITICAL DATABASE SYNCHRONIZATION ISSUE

**Date:** 2025-10-16
**Severity:** CATASTROPHIC
**Impact:** Production database severely out of sync with codebase

## Executive Summary

During admin/technician workflow testing, we discovered that the remote Supabase database is **severely out of sync** with the local migration files. The remote database only has **7 migrations applied**, while the local codebase contains **80+ migration files**. This explains why job completion and many other features have been failing.

## Discovery Timeline

### Test Scenario

Testing the complete admin → technician → customer workflow:

1. ✅ Admin logs in and assigns technician (Mohib) to Claire's booking
2. ✅ Technician logs in and views assigned job
3. ✅ Technician updates job status to "in_progress" - SUCCESS
4. ❌ Technician attempts to complete job and submit report - FAILED

### Bug Discovery Sequence

#### BUG #1: Missing Migration File (20250620090000)

**Symptom:** Job completion failed with function signature mismatch
**Error:** `Could not find the function public.update_booking_status(p_booking_id, p_new_status, p_report_notes, p_user_id)`
**Root Cause:** Migration `20250620090000_add_report_notes_and_fix_rls.sql` was never applied to remote database
**Fix:** Applied migration using MCP tool - SUCCESS

#### BUG #2: Missing Database Columns

**Symptom:** Job completion failed with column doesn't exist error
**Error:** `column "completed_at" of relation "bookings" does not exist`
**Root Cause:** Migration 20250620090000 created a function that references `started_at`, `completed_at`, and `cancelled_at` columns, but never created those columns
**Fix:** Created and applied migration `20251016000000_add_booking_timestamp_columns.sql` - SUCCESS

#### BUG #3 (CATASTROPHIC): Missing Notification System

**Symptom:** Job completion still failed after fixing bugs #1 and #2
**Error:** `function public.create_notification(uuid, text, text, text, jsonb) does not exist`
**Root Cause:** The `update_booking_status` function calls `create_notification`, but that function was never created on remote database

**INVESTIGATION REVEALED CATASTROPHIC ISSUE:**
Remote database is missing 70+ migrations!

## Current Database State

### Migrations Applied to Remote Database (ONLY 7!)

```
1. 20250315000000 - initial_schema
2. 20250315000100 - row_level_security
3. 20250315000300 - jwt_custom_hook
4. 20250315000400 - update_all_user_roles
5. 20251015195959 - fix_rls_circular_dependency_v2
6. 20251016045954 - add_report_notes_and_fix_rls (applied during testing)
7. 20251016050402 - add_booking_timestamp_columns (applied during testing)
```

### Critical Missing Migrations (Partial List)

#### Notification System

- `20250525000000_add_notification_system.sql` - Creates notifications table and create_notification function
- `20250610000000_fix_search_path_and_function_types.sql` - Fixes notification function types
- `20250619013313_fix_notification_function_parameters.sql` - Fixes notification parameters
- `20250619013315_add_security_measures_to_notification_functions.sql` - Adds security to notifications

#### Stripe Integration

- `20250617000000_create_stripe_tables.sql` - Creates customers, payments, subscriptions, invoices tables
- `20250617000001_update_booking_status_enum.sql` - Adds payment-related booking statuses
- `20250617000002_create_subscription_invoice_status_enum.sql` - Creates Stripe enums
- `20250616000300_add_billing_address_and_payment_methods.sql` - Adds payment methods table
- Multiple other Stripe-related migrations

#### Booking Images System

- `20250619013300_create_booking_images_table.sql` - Creates booking_images table
- `20250619013301_apply_booking_images_rls.sql` - Creates RLS policies
- `20250619013302_create_booking_images_bucket.sql` - Creates storage bucket
- `20250619013304_add_type_column_to_booking_images.sql` - Adds type column
- `20250619013306_fix_booking_images_bucket_and_rls.sql` - Fixes bucket setup
- `20250619013310_fix_booking_images_fetch_error.sql` - Fixes fetch errors

#### Performance & Optimizations

- `20250408212245_add_single_column_indexes.sql` - Performance indexes
- `20250408212246_add_composite_indexes.sql` - Composite indexes
- `20250408212248_add_constraints.sql` - Database constraints
- `20250408212249_create_dashboard_metrics_function.sql` - Admin dashboard function
- `20250409023756_apply_database_optimizations.sql` - Database optimizations
- `20251015000002_add_performance_indexes.sql` - Additional indexes

#### Booking System Functions

- `20250420120000_fix_update_booking_status_function.sql` - Function fixes
- `20250420180000_add_report_notes_to_update_booking_status.sql` - Report notes
- `20250602000000_complete_booking_system_fixes.sql` - Complete booking fixes
- `20250615000000_fix_booking_assignment_functions.sql` - Assignment functions
- `20250618000003_create_booking_status_payment_function.sql` - Payment status function
- Many notification-related booking triggers

#### RLS & Security

- `20250419060750_add_admin_rls_for_payments.sql` - Admin RLS for payments
- `20250621000000_allow_admin_select_booking_images.sql` - Admin access to images
- `20250520000000_install_custom_claims.sql` - JWT custom claims
- `20250521000000_fix_search_path_security.sql` - Search path security
- `20250522000000_fix_search_path_security_v2.sql` - Additional security
- `20251015120000_fix_rls_infinite_recursion.sql` - RLS recursion fixes
- `20251015120001_fix_remaining_rls_recursion.sql` - More RLS fixes

#### Other Critical Systems

- `20250624120000_create_services_table.sql` - Services table
- `20250623000000_add_area_type_and_property_size_columns.sql` - Property fields
- `20250510000000_add_test_data_management.sql` - Test data utilities
- `20250419222343_truncate_bookings.sql` - Data cleanup
- Multiple enum updates and type fixes

## Impact Assessment

### Features Completely Broken

1. ❌ Job completion with report notes
2. ❌ All notifications (booking updates, assignments, completions)
3. ❌ Stripe payments and subscriptions
4. ❌ Booking image uploads (before/after photos)
5. ❌ Payment method management
6. ❌ Invoice generation
7. ❌ Admin dashboard metrics
8. ❌ Many RLS policies (potential security vulnerabilities)

### Features Partially Working

1. ⚠️ Booking creation (works but missing payment integration)
2. ⚠️ Status updates (works but no notifications sent)
3. ⚠️ User authentication (works but missing some custom claims)
4. ⚠️ Service browsing (works but missing optimizations)

### Data Integrity Concerns

1. ⚠️ Missing foreign key constraints
2. ⚠️ Missing database indexes (performance issues)
3. ⚠️ Incomplete RLS policies (security vulnerabilities)
4. ⚠️ Missing Stripe-related data tables

## Root Cause Analysis

**Hypothesis:** The remote Supabase database was reset or recreated at some point, and only a minimal set of migrations were manually re-applied. The local codebase continued to accumulate migrations, creating a massive drift between local and remote schemas.

**Evidence:**

- Only 4 original migrations from March 2025 are applied
- Two recent migrations from October 2025 (RLS fixes) were applied
- Two migrations applied during this testing session (October 16)
- Massive gap of ~70 migrations missing in between

## Recommended Action Plan

### IMMEDIATE (Before Continuing Development)

1. **Complete Database Audit**
   - Document all tables, columns, and functions currently in remote DB
   - Compare with what local migrations expect
   - Identify data that exists in remote DB

2. **Migration Sync Strategy Decision**

   ```
   Option A: Fresh Database Reset
   - Drop and recreate remote database
   - Apply ALL migrations in order
   - Pros: Clean slate, guaranteed consistency
   - Cons: Loses any production data

   Option B: Incremental Migration Application
   - Apply missing migrations one by one
   - Test after each batch
   - Pros: Preserves existing data
   - Cons: Risky, may have conflicts, time-consuming

   Option C: Schema Comparison & Targeted Fixes
   - Use schema diff tools
   - Apply only critical missing migrations
   - Pros: Faster, preserves data
   - Cons: May miss subtle issues
   ```

3. **Establish Migration Management Process**
   - Document how migrations are applied to remote
   - Set up CI/CD for automatic migration application
   - Add migration status checks to deployment pipeline

### CRITICAL MIGRATIONS TO APPLY FIRST

If choosing Option B (incremental), apply in this order:

**Priority 1: Core System Functions**

```
20250525000000_add_notification_system.sql
20250610000000_fix_search_path_and_function_types.sql
20250619013313_fix_notification_function_parameters.sql
```

**Priority 2: Booking System Complete**

```
20250420120000_fix_update_booking_status_function.sql
20250420180000_add_report_notes_to_update_booking_status.sql
20250602000000_complete_booking_system_fixes.sql
20250615000000_fix_booking_assignment_functions.sql
```

**Priority 3: Security & RLS**

```
20250419060750_add_admin_rls_for_payments.sql
20250520000000_install_custom_claims.sql
20250521000000_fix_search_path_security.sql
20250522000000_fix_search_path_security_v2.sql
```

**Priority 4: Booking Images**

```
20250619013300_create_booking_images_table.sql
20250619013301_apply_booking_images_rls.sql
20250619013302_create_booking_images_bucket.sql
20250619013304_add_type_column_to_booking_images.sql
```

**Priority 5: Stripe Integration** (if needed before testing)

```
20250617000000_create_stripe_tables.sql
20250617000001_update_booking_status_enum.sql
20250617000002_create_subscription_invoice_status_enum.sql
20250616000300_add_billing_address_and_payment_methods.sql
```

**Priority 6: Performance & Optimizations**

```
20250408212245_add_single_column_indexes.sql
20250408212246_add_composite_indexes.sql
20250408212249_create_dashboard_metrics_function.sql
```

## Testing Blockers

**Cannot continue workflow testing until:**

1. ✅ `create_notification` function exists
2. ✅ Booking images tables exist
3. ✅ All booking-related functions are complete
4. ⏸️ (Optional for now) Stripe tables exist

**Minimum migrations needed to unblock job completion test:**

- Apply Priority 1 (Notification system)
- Apply Priority 2 (Booking functions)
- Verify booking_images table exists or fix query to handle missing table

## Lessons Learned

1. **Migration Management is Critical:** Never manually apply individual migrations to production
2. **Schema Drift Detection:** Need automated checks to detect when local/remote are out of sync
3. **Testing Requirements:** Comprehensive testing reveals hidden infrastructure issues
4. **Documentation:** Migration application process must be documented and automated

## Files Created During Investigation

1. `supabase/migrations/20251016000000_add_booking_timestamp_columns.sql` - Fixes missing timestamp columns
2. `CRITICAL_DATABASE_SYNC_ISSUE.md` - This document

## Next Steps

**DECISION REQUIRED:** How to handle the 70+ missing migrations?

**User should:**

1. Review this document
2. Decide on migration sync strategy (Option A, B, or C above)
3. Backup any important data in remote database
4. Execute chosen migration strategy
5. Verify all systems functional after migration sync

**DO NOT continue feature development until database sync is resolved.**

---

## Appendix: Error Logs

### First Failure (Function Signature Mismatch)

```
[updateBookingStatus] RPC error: {
  "code":"PGRST202",
  "message":"Could not find the function public.update_booking_status(p_booking_id, p_new_status, p_report_notes, p_user_id) in the schema cache",
  "hint":"Perhaps you meant to call the function public.update_booking_status(p_booking_id, p_new_status, p_report_notes)"
}
```

### Second Failure (Missing Columns)

```
[updateBookingStatus] RPC error: {
  "code":"42703",
  "message":"column \"completed_at\" of relation \"bookings\" does not exist"
}
```

### Third Failure (Missing Notification Function)

```
[updateBookingStatus] RPC error: {
  "code":"42883",
  "message":"function public.create_notification(uuid, text, text, text, jsonb) does not exist",
  "hint":"No function matches the given name and argument types. You might need to add explicit type casts."
}
```

### Additional Error (Missing Booking Images Column)

```
[fetchPhotos] Error: {
  "code":"42703",
  "message":"column booking_images.storage_path does not exist"
}
```
