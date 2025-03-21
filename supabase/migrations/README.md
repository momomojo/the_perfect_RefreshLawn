# Supabase Migrations

This directory contains database migrations for the RefreshLawn application.

## Critical Fixes

### 20250523000000_fix_duplicate_profile_triggers.sql

This migration fixes an issue where two triggers on the `auth.users` table were both attempting to create profiles for new users:

1. `on_auth_user_created` (calling `handle_new_user()`)
2. `create_profile_after_signup` (calling `create_profile_for_user()`)

This was causing a unique constraint violation on the `profiles_pkey` when creating new users through the Supabase UI.

**The fix:**

- Drops the duplicate trigger `create_profile_after_signup`
- Updates `handle_new_user()` to:
  - Check if a profile already exists before creating it
  - Ensure proper sync with the `user_roles` table
  - Set proper function permissions

**Error before fix:**

```
ERROR: duplicate key value violates unique constraint "profiles_pkey" (SQLSTATE 23505)
```

## Custom Claims Integration

The application uses Supabase custom claims for user roles and permissions management. Important notes:

1. User roles are stored in both the `profiles.role` column and the `user_roles` table
2. The `custom_access_token_hook` function adds these roles to JWT tokens
3. Claims only update when users refresh their auth session

Follow these steps when setting up a new environment:

1. Configure the JWT hook in Supabase Dashboard (Authentication > Hooks)
2. Bootstrap at least one claims admin using:
   ```sql
   SELECT set_claim('USER_UUID', 'claims_admin', 'true');
   ```
