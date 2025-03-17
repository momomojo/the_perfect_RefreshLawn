# RefreshLawn Migration Verification Guide

This guide will help you verify that all database migrations have been successfully applied to your Supabase project.

## Migration Verification Steps

1. **Access the Supabase Dashboard**

   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project: `https://brvgbflmcolgvswuzjho.supabase.co`

2. **Verify Database Tables**

   - Navigate to **Table Editor** in the left sidebar
   - Confirm the following tables exist:
     - `profiles`
     - `services`
     - `recurring_plans`
     - `bookings`
     - `reviews`
     - `payment_methods`

3. **Verify Database Functions**

   - Navigate to **Database** > **Functions** in the left sidebar
   - Confirm the following functions exist:
     - `custom_access_token_hook`
     - `add_user_role_to_jwt`
     - `update_user_role_in_jwt_metadata`
     - `auth.is_admin()`
     - `auth.is_technician()`
     - `auth.is_customer()`

4. **Verify Row Level Security (RLS)**

   - Navigate to **Authentication** > **Policies** in the left sidebar
   - Confirm that RLS is enabled for all tables
   - Verify policies exist for each user role (admin, technician, customer)

5. **Enable JWT Hook (REQUIRED MANUAL STEP)**

   - Navigate to **Authentication** > **Hooks** in the left sidebar
   - Enable the **Custom JWT** hook
   - Select the `custom_access_token_hook` function
   - Click **Save**

6. **Run Verification SQL**
   - Navigate to **SQL Editor** in the left sidebar
   - Open a new query
   - Paste the contents of `supabase/backup-test.sql`
   - Run the query and confirm all checks pass

## Common Issues and Troubleshooting

### JWT Hook Not Working

If user roles are not being applied correctly in JWT tokens:

1. Make sure the Custom JWT hook is enabled in Authentication > Hooks
2. Verify the `custom_access_token_hook` function exists and is selected
3. Test with a new login to ensure the JWT contains the role claim

### Missing Tables or Functions

If any tables or functions are missing:

1. Check the Supabase CLI migration status: `supabase migration list`
2. Push any missing migrations: `supabase db push`
3. Review Supabase logs for any SQL errors during migration

### RLS Policies Not Applied

If RLS policies are not working as expected:

1. Verify RLS is enabled for each table
2. Check specific policies for each table
3. Test with different user roles to confirm access control is working properly

## Verification Complete

Once you've confirmed all aspects of the migration, your RefreshLawn application's database should be fully functional with proper role-based access control.
