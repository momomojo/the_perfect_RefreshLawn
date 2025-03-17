# RefreshLawn Migration Guide

This guide explains how to apply the migrations in this project to set up the Supabase database.

## Migration Files

The migrations are located in the `supabase/migrations` directory and should be applied in the following order:

1. `20250315000000_initial_schema.sql` - Creates the base tables and triggers
2. `20250315000100_row_level_security.sql` - Sets up Row Level Security policies
3. `20250315000200_jwt_helper_functions.sql` - Creates JWT helper functions
4. `20250315000300_jwt_custom_hook.sql` - Sets up the custom access token hook
5. `20250315000400_update_all_user_roles.sql` - Updates existing user roles

## Applying Migrations

### Option 1: Using Supabase CLI

If you have the Supabase CLI installed and Docker running, you can apply the migrations using:

```bash
# Link to your Supabase project
supabase link --project-ref <your-project-ref>

# Push the migrations to your Supabase project
supabase db push
```

### Option 2: Using the Supabase Dashboard

If you don't have Docker or the Supabase CLI, you can apply the migrations manually:

1. Go to the Supabase Dashboard
2. Select your project
3. Go to the SQL Editor
4. Open each migration file in order
5. Run the SQL commands in each file

## Verifying Migrations

After applying the migrations, you can verify that everything is set up correctly by running the `backup-test.sql` file in the SQL Editor. This will check if all the tables, functions, and triggers exist.

## Important Notes

1. After applying the migrations, you need to manually enable the JWT hook in the Supabase Dashboard:

   - Go to Authentication > Hooks
   - For the "JWT Access Token" event type, add a hook
   - Select "Database Function" as the hook type
   - Choose "public.custom_access_token_hook" as the function
   - Save the changes

2. Users will need to log out and log back in to get a new JWT with their role.

3. If you're migrating from an existing database, you may need to run the `update_user_role_in_jwt_metadata()` function to update existing users' JWT metadata.

## Troubleshooting

If you encounter issues with the migrations, check the following:

1. Make sure the migrations are applied in the correct order
2. Verify that the JWT hook is enabled in the Supabase Dashboard
3. Check if the custom_access_token_hook function exists in the database
4. Ensure that users have roles assigned in the profiles table
