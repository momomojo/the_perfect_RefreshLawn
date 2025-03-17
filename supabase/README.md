# RefreshLawn Supabase Setup

This directory contains the Supabase configuration and migrations for the RefreshLawn application.

## Directory Structure

- `migrations/` - Contains all database migration files
- `seed.sql` - (Optional) Contains seed data for development purposes
- `config.toml` - Supabase configuration file

## Migration Files

Migrations are numbered in chronological order and should be applied sequentially:

1. `20250315000000_initial_schema.sql` - Initial database schema (tables, triggers, etc.)
2. `20250315000100_row_level_security.sql` - Row Level Security policies
3. `20250315000200_jwt_helper_functions.sql` - JWT helper functions
4. `20250315000300_jwt_custom_hook.sql` - Custom access token hook
5. `20250315000400_update_all_user_roles.sql` - Updates existing user roles
6. `20250316001000_fix_jwt_role_handling.sql` - Updates JWT role handling for better compatibility
7. `20250501000100_fix_rbac_implementation.sql` - Updates RBAC implementation to align with Supabase best practices

## Important Notes

### JWT Claims Setup

After applying migrations, you must manually enable the JWT custom hook in the Supabase Dashboard:

1. Go to Authentication > Hooks
2. For the "JWT Access Token" event type, add a hook
3. Select "Database Function" as the hook type
4. Choose "public.custom_access_token_hook" as the function
5. Save the changes

### User Roles

The application uses three roles:

- `admin` - Full access to all functionality
- `technician` - Access to assigned jobs and related functionality
- `customer` - Access to their own data and services

### Running Migrations

To apply all migrations:

```bash
supabase db reset
```

To apply migrations since last deployment:

```bash
supabase db push
```

## Development Setup

For local development, you can use:

```bash
supabase start
```

This will start a local Supabase instance with all migrations applied.

# Supabase Setup for RefreshLawn

This directory contains the database schema, migrations, and related files for the RefreshLawn application using Supabase.

## Directory Structure

```
supabase/
├── migrations/              # Database migrations
│   ├── 20250316_jwt_custom_hook.sql            # Custom access token hook
│   ├── 20250316_jwt_helper_functions.sql       # JWT helper functions
│   └── 20250316_update_all_user_roles.sql      # Update user roles script
│
├── docs/                    # Documentation
│   ├── jwt-hook-setup-guide.md                 # JWT hook setup guide
│   └── jwt-hook-test.sql                       # Test script for JWT hook
│
├── schema.sql               # Main schema file
├── rls.sql                  # Row Level Security policies
├── custom_access_token_hook.sql # JWT hook function (legacy)
└── jwt-claims.sql           # JWT claims helper functions (legacy)
```

## Setup Instructions

1. **Setting up a new database**:

   Run the main schema file:

   ```bash
   psql -U postgres -h localhost -d refreshlawn -f schema.sql
   ```

   This will:

   - Create all tables
   - Set up triggers and functions
   - Import RLS policies
   - Set up JWT hooks for authentication

2. **Running individual migrations**:

   If you need to apply specific migrations:

   ```bash
   psql -U postgres -h localhost -d refreshlawn -f migrations/20250316_jwt_custom_hook.sql
   ```

3. **Setting up JWT hooks in the Supabase Dashboard**:

   After applying the migrations, you need to enable the JWT hook in the Supabase Dashboard:

   - Go to Authentication > Hooks
   - Under "Custom JWT Claims", toggle the switch to enable it
   - Select "public.custom_access_token_hook" from the dropdown
   - Click "Save Changes"

## JWT Role Claims Configuration

For the JWT role claims to work properly:

1. The migrations set up:

   - A custom access token hook function to add user roles to JWT claims
   - Helper functions to check roles in JWTs
   - Fallback triggers for user metadata updates

2. Key features:
   - User roles are stored in the `profiles` table
   - The hook adds roles to the `app_metadata.user_role` field in JWTs
   - The hook properly handles type casting to avoid the polymorphic type error

## Troubleshooting JWT Claims

If user roles are not appearing in JWT claims:

1. Check if the JWT hook is enabled in the dashboard
2. Run the user role update script:
   ```sql
   \i migrations/20250316_update_all_user_roles.sql
   ```
3. Ask users to sign out and sign in again for new tokens
4. Run the test script to check the hook function:
   ```sql
   \i docs/jwt-hook-test.sql
   ```

## User Role Management

When a user registers:

1. A profile is created via trigger with default role 'customer'
2. When the user signs in, the JWT hook adds their role to the token
3. The application can check the role using JWT claims

To change a user's role:

1. Update the role in the `profiles` table
2. Update their `app_metadata` using the update script
3. The user needs to sign out and sign in again for the new role to take effect

## Important Notes

- The JWT hook adds the user's role to the JWT token in the `app_metadata.user_role` field
- Users need to sign out and sign in again to get a new token with their role
- Use the test script in `docs/jwt-hook-test.sql` to verify the JWT hook setup

## Documentation

See `docs/jwt-hook-setup-guide.md` for detailed information about the JWT hook setup.

# Supabase Database Setup Instructions

This directory contains SQL scripts to set up the database schema for the Lawn Refresh application.

## Files

- `schema.sql` - Creates all tables, triggers, and sample data
- `rls.sql` - Sets up Row-Level Security (RLS) policies for data protection
- `jwt-claims.sql` - Configures custom JWT claims for role-based access control
- `custom_access_token_hook.sql` - Configures the Custom Access Token Hook for role-based access control

## Setup Instructions

Follow these steps to set up your Supabase database:

### 1. Tables and Schema Setup

1. Log in to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to the **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of `schema.sql` into the editor
6. Click **Run** to execute the script

### 2. Row-Level Security Setup

1. After the schema is set up, create another new query
2. Copy the contents of `rls.sql` into the editor
3. Click **Run** to execute the script

### 3. JWT Claims for Role-Based Access Control

1. After setting up RLS, create another new query
2. Copy the contents of `jwt-claims.sql` into the editor
3. Click **Run** to execute the script
4. This will enable role-based access control via JWT tokens

### 4. Setting Up the Custom Access Token Hook

1. Create another new query in the SQL Editor
2. Copy the contents of `custom_access_token_hook.sql` into the editor
3. Click **Run** to execute the script
4. After creating the function, go to **Authentication** > **Auth Hooks** in the Supabase Dashboard
5. Enable the "Customize Access Token (JWT) Claims hook"
6. Select "Postgres" as the Hook type
7. Select "public" as the Postgres Schema
8. Select "custom_access_token_hook" as the Postgres function
9. Click "Create hook" to save your changes

### Verification

After running all scripts and setting up the Custom Access Token Hook, you can verify the setup:

1. Go to the **Table Editor** in the left sidebar
2. You should see the tables: `profiles`, `services`, `recurring_plans`, `bookings`, `reviews`, and `payment_methods`
3. Check if the sample data has been inserted into the `services` and `recurring_plans` tables
4. To verify JWT claims, sign in with a user and check if their role is correctly added to their JWT token

## Manual Execution

If you prefer to run the commands manually, you can create the tables one by one. Here's the order to follow:

1. Create the `profiles` table
2. Create the `services` table
3. Create the `recurring_plans` table
4. Create the `bookings` table (depends on the previous three tables)
5. Create the `reviews` table (depends on bookings and profiles)
6. Create the `payment_methods` table (depends on profiles)
7. Create triggers for profile creation and updated_at columns
8. Set up RLS policies
9. Configure JWT claims for role-based access control

## Common Issues

- If you encounter an error about tables already existing, you may need to drop them first (the script attempts to do this)
- If you see errors about RLS policies, make sure the tables were created successfully first
- If you get permission errors, make sure you're using the correct Supabase project and have admin access
- If JWT claims are not working, verify that the triggers are properly created in the auth schema

# Supabase Configuration

This directory contains SQL files for setting up Supabase functionality, particularly for JWT role claims.

## JWT Role Claims Configuration

For the JWT role claims to work properly, you need to:

1. Execute the SQL files in your Supabase project:

   - `jwt-claims.sql`: Sets up triggers to add user roles to JWT tokens
   - `custom_access_token_hook.sql`: Creates the function for JWT claims hook

2. Configure the JWT hook in your Supabase dashboard:
   - Go to Authentication > Hooks in your Supabase dashboard
   - Under "JWT claim function", select `custom_access_token_hook` from the dropdown
   - Save the configuration

## Troubleshooting JWT Claims

If user roles are not appearing in JWT claims:

1. Verify the SQL functions are present in your Supabase database:

   ```sql
   SELECT * FROM pg_proc WHERE proname = 'custom_access_token_hook';
   ```

2. Ensure the custom access token hook is selected in the dashboard settings

3. Check if user profiles have roles assigned:

   ```sql
   SELECT * FROM profiles WHERE id = 'your-user-id';
   ```

4. Try forcing a token refresh by calling:

   ```typescript
   await supabase.auth.refreshSession();
   ```

5. Use the `/supabase-test` route in the app and select "Authentication Tests" > "getUserRole" to inspect the JWT token contents

## Important Notes

1. **JWT Claims Availability**: After a user's role changes, a token refresh is required for the new role to appear in JWT claims.

2. **Supabase Client**: Ensure you're using a consistent Supabase client throughout the application. The client is configured in `lib/supabase.ts`.

3. **Testing**: Use the testing components at `app/components/testing/*` to verify JWT claims are working correctly.

## References

- [Supabase JWT Docs](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## Testing JWT Claims

To verify your JWT claims are working correctly, you can use the following SQL in the Supabase dashboard SQL editor:

```sql
-- Test the custom_access_token_hook function with a sample user
-- Replace the UUID with an actual user ID from your database
WITH test_event AS (
  SELECT jsonb_build_object(
    'user_id', 'replace-with-a-real-user-id',
    'app_metadata', jsonb_build_object('provider', 'email')
  ) as event
)
SELECT
  event as original_event,
  public.custom_access_token_hook(event) as modified_event
FROM test_event;
```

You should see the `user_role` field added to the `app_metadata` object in the result. If it's not there, verify:

1. The user exists in the profiles table and has a role assigned
2. The `custom_access_token_hook` function is correctly implemented
3. The JWT hook is enabled in the Supabase dashboard

After making changes to the hook function, you may need to:

1. Sign out and sign back in to see the changes take effect
2. Temporarily disable and re-enable the JWT hook in the Supabase dashboard
3. Use the enhanced `getUserRole` test in the AuthTest component to check if the claims are being properly set

Remember that JWT tokens are only refreshed when:

- A user logs in
- A user logs out and logs back in
- The token expires and is refreshed
- You manually refresh the token using `supabase.auth.refreshSession()`

# User Registration and Role Assignment

When a user registers in the application, roles are assigned through the following process:

1. **During Sign-Up**:

   - The user's role is included in `raw_user_meta_data` during the initial `auth.signUp()` call
   - A profile is created via database trigger, which sets the role based on `raw_user_meta_data` or defaults to 'customer'
   - The profile is then updated with additional user information (name, address, etc.)

2. **JWT Claims**:

   - The `custom_access_token_hook` function adds the user's role to the JWT token
   - This function first checks `raw_user_meta_data` for the role and then falls back to the profiles table
   - JWT claims are refreshed when tokens are issued (on login, token refresh, etc.)

3. **Testing**:
   - The `/supabase-test` route provides tools to test authentication and JWT claims
   - Use the "AuthTest" component to sign up users with different roles and verify JWT claims

## Troubleshooting User Roles

If user roles are not correctly assigned during sign-up:

1. Verify the SQL functions in the database:

   ```sql
   SELECT * FROM pg_proc WHERE proname IN ('custom_access_token_hook', 'create_profile_for_user');
   ```

2. Check if the role is being set in `raw_user_meta_data` during sign-up:

   ```sql
   SELECT raw_user_meta_data FROM auth.users WHERE email = 'test@example.com';
   ```

3. Check if the role is properly set in the profiles table:

   ```sql
   SELECT id, role FROM profiles WHERE id = 'user-id';
   ```

4. Run the `run-in-supabase-dashboard.sql` file to update all relevant functions

## Role-Based Access Control (RBAC)

RefreshLawn uses Supabase's RBAC with custom JWT claims for authorization. Our implementation:

1. Follows Supabase's best practices for custom access token hooks
2. Adds role claims to standard JWT locations for maximum compatibility
3. Provides helper functions for both server-side and client-side role checking

For a detailed guide, see [RBAC Implementation Guide](./docs/RBAC_IMPLEMENTATION_GUIDE.md).
