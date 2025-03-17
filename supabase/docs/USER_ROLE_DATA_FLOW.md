# User Role Management in RefreshLawn

This document explains how user roles are managed in the RefreshLawn application.

## Data Flow Overview

1. **User Creation**:

   - When a user signs up, the `handle_new_user` trigger function executes.
   - This function creates entries in both the `profiles` and `user_roles` tables.
   - The role is determined from `raw_user_meta_data->>'role'` or defaults to 'customer'.

2. **Role Updates**:

   - When a profile's role is updated, the `on_profile_role_updated` trigger executes.
   - This trigger syncs the role to the `user_roles` table via the `sync_profile_role_to_user_roles` function.

3. **JWT Token Claims**:
   - The `custom_access_token_hook` function runs when a JWT token is issued.
   - It looks for the user's role in the `user_roles` table first.
   - If not found, it falls back to the `profiles` table.
   - The role is added to JWT claims as both `user_role` and `app_metadata.role`.

## Database Structure

### Tables:

- **auth.users**: Managed by Supabase, contains authentication data.
- **public.profiles**: Contains user profile data, including the role.
- **public.user_roles**: Contains user role assignments (type-safe with app_role enum).

### Functions and Triggers:

- **handle_new_user()**: Creates profile and user_role entries for new users.
- **sync_profile_role_to_user_roles()**: Keeps user_roles in sync with profile roles.
- **custom_access_token_hook()**: Adds role to JWT tokens.
- **on_auth_user_created**: Trigger on auth.users that calls handle_new_user().
- **on_profile_role_updated**: Trigger on profiles that calls sync_profile_role_to_user_roles().

## Error Handling

The system includes comprehensive error handling:

1. If `handle_new_user` fails to insert into `user_roles`, it still creates a profile.
2. If role casting fails, it logs warnings but doesn't block user creation.
3. The `custom_access_token_hook` has fallback logic to handle missing user roles.

## Maintaining Consistency

To maintain role consistency across the system:

1. Always update roles through the profiles table (preferred) or directly in user_roles.
2. The synchronization triggers ensure both tables stay aligned.
3. Regularly run the `fix_user_role_consistency` function to fix any discrepancies.

## Troubleshooting

If JWT tokens don't contain the expected roles:

1. Verify the user has entries in both `profiles` and `user_roles` tables.
2. Check that the `custom_access_token_hook` function is properly deployed and marked as STABLE.
3. Make sure the hook is enabled in the Supabase Dashboard under Authentication > Hooks.
4. Use the Auth Diagnostics page to view current JWT claims and database role entries.

## Recent Fixes

1. Updated `handle_new_user` to populate both `profiles` and `user_roles` tables.
2. Added synchronization trigger between `profiles` and `user_roles`.
3. Fixed the `custom_access_token_hook` function to be STABLE as required by Supabase.
4. Added data repair scripts to fix any existing inconsistencies.
