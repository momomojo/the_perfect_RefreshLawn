# User Role Management System

This document provides an overview of the role management system implemented in the RefreshLawn application database.

## Overview

The role management system is designed to ensure consistency between user roles stored in various locations:

- The `profiles` table (which contains user profiles and roles)
- The `user_roles` table (which maps users to specific roles)
- The `auth.users` table's metadata (both `raw_app_meta_data` and `raw_user_meta_data`)
- The JWT claims issued by Supabase Auth

## Core Functions

### 1. Role Synchronization

#### `sync_user_role()`

A consolidated trigger function that handles bidirectional synchronization of roles between tables.

- **When triggered from profiles**: Updates user_roles and auth.users metadata
- **When triggered from user_roles**: Updates profiles table
- **Security**: SECURITY DEFINER with search_path set to 'public'
- **Usage**: Called automatically via triggers when roles change

### 2. Role Management

#### `manage_user_role(p_user_id uuid, p_role text, p_update_metadata boolean DEFAULT true)`

A comprehensive function to update a user's role across all tables.

- **Parameters**:
  - `p_user_id`: The UUID of the user
  - `p_role`: The role to assign
  - `p_update_metadata`: Whether to update JWT metadata (default: true)
- **Returns**: Boolean indicating success
- **Security**: SECURITY DEFINER with search_path set to 'public'
- **Usage**: Can be called directly to programmatically update roles

### 3. Profile Creation

#### `create_user_profile()`

A trigger function that creates profiles for new users during signup.

- **Behavior**:
  - Extracts role from user metadata or defaults to 'customer'
  - Creates entries in both profiles and user_roles tables
  - Updates app_metadata to include the role
- **Security**: SECURITY DEFINER with search_path set to 'public'
- **Usage**: Called automatically via trigger on user creation

### 4. Role Consistency

#### `check_and_fix_roles(target_user_id uuid DEFAULT NULL, fix_issues boolean DEFAULT true)`

A function to identify and fix inconsistencies in role data.

- **Parameters**:
  - `target_user_id`: UUID of specific user to check (or NULL for all users)
  - `fix_issues`: Whether to automatically fix inconsistencies (default: true)
- **Returns**: Table with consistency information and actions taken
- **Security**: SECURITY DEFINER with search_path set to 'public'
- **Usage**: Can be called directly or scheduled via cron job

#### `daily_role_consistency_check()`

A wrapper function to run consistency checks on a daily basis.

- **Behavior**: Calls `check_and_fix_roles()` on all users with automatic fixing
- **Security**: SECURITY DEFINER with search_path set to 'public'
- **Usage**: Called via scheduled Supabase Edge Function or directly

### 5. Role Information

#### `get_user_role(p_user_id uuid DEFAULT auth.uid())`

A utility function to get a user's role.

- **Parameters**: `p_user_id`: UUID of user (defaults to current user)
- **Returns**: Text representation of the user's role
- **Security**: SECURITY INVOKER with search_path set to 'public'
- **Usage**: Called in application code or RLS policies

#### `is_admin()`, `is_technician()`, `is_customer()`

Utility functions to check if the current user has a specific role.

- **Returns**: Boolean indicating if the user has the role
- **Security**: SECURITY INVOKER with search_path set to 'public'
- **Usage**: Used in RLS policies to control data access

### 6. JWT Enhancement

#### `custom_access_token_hook(event jsonb)`

A Supabase Auth Hook function that adds user role to JWT claims.

- **Parameters**: `event`: The JWT event from Supabase Auth
- **Returns**: Modified event with user role in claims
- **Security**: SECURITY INVOKER with search_path set to 'public'
- **Usage**: Automatically called by Supabase Auth when generating JWTs

## Triggers

The following triggers ensure automatic role synchronization:

1. `sync_user_role_from_profiles_trigger` - Syncs when a profile's role changes
2. `sync_user_role_from_user_roles_trigger` - Syncs when a user_role changes
3. `create_profile_after_signup` - Creates profile when a user signs up

## Backward Compatibility Functions

For backward compatibility, the following functions are maintained but redirect to the new consolidated functions:

- `fix_user_role_consistency()` → `check_and_fix_roles()`
- `check_role_consistency()` → `check_and_fix_roles()`
- `fix_my_role_consistency()` → `check_and_fix_roles()`
- `update_user_role()` → `manage_user_role()`
- `update_user_role_safe()` → `manage_user_role()`
- `update_all_user_roles_in_metadata()` → Calls `manage_user_role()` for all users
- `update_user_role_in_jwt_metadata()` → `update_all_user_roles_in_metadata()`

## Setup Requirements

To ensure the authentication system works correctly:

1. **Database Permissions**: Grant the `supabase_auth_admin` role access to:

   - The public schema: `GRANT USAGE ON SCHEMA public TO supabase_auth_admin;`
   - The auth hook function: `GRANT EXECUTE ON FUNCTION custom_access_token_hook TO supabase_auth_admin;`
   - The user_roles table: `GRANT ALL ON TABLE user_roles TO supabase_auth_admin;`
   - The profiles table: `GRANT ALL ON TABLE profiles TO supabase_auth_admin;`

2. **RLS Policies**: Create policies allowing the auth admin to access the tables:

   ```sql
   CREATE POLICY "Allow auth admin to read user roles"
   ON user_roles FOR SELECT TO supabase_auth_admin USING (true);

   CREATE POLICY "Allow auth admin to read profiles"
   ON profiles FOR SELECT TO supabase_auth_admin USING (true);
   ```

3. **Supabase Dashboard Configuration**:
   - Navigate to Authentication > Hooks (Beta)
   - Select `custom_access_token_hook` for the Custom Access Token Hook
   - Enable the hook

## Implementation Notes

- All functions have `SET search_path TO 'public'` to prevent SQL injection
- The user_roles table is treated as the primary source of truth
- Bidirectional synchronization prevents inconsistencies
- Error handling ensures operations don't fail completely
- Type safety is maintained with explicit casting to app_role

## Usage in Client Applications

To access the user role in client applications, decode the JWT:

```typescript
import { jwtDecode } from "jwt-decode";

const { subscription: authListener } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    if (session) {
      const jwt = jwtDecode(session.access_token);
      const userRole = jwt.role; // Access the role from JWT claims
    }
  }
);
```
