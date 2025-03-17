# Role Management in RefreshLawn

This guide explains how user roles are managed in the RefreshLawn application using the official Supabase approach with a dedicated `user_roles` table.

## Overview

Our role-based access control (RBAC) system follows the official Supabase approach:

1. **User Roles Table** - Stores role assignments in a dedicated `user_roles` table
2. **Custom Access Token Hook** - Adds roles to JWT tokens for authentication
3. **Client-Side Access** - Easy access to roles via JWT claims or database queries

## User Roles

The application supports three roles:

- `admin` - Full system access (manage users, services, etc.)
- `technician` - Service provider access (view assigned jobs, update status)
- `customer` - Basic user access (book services, manage profile)

## Setting Roles

### During Signup

When a user signs up, you can set their role using the `options.data` field:

```typescript
import { signUpWithRole } from "../utils/userRoleManager";

// Sign up a user as a technician
const { data, error } = await signUpWithRole(
  "technician@example.com",
  "password123",
  "technician"
);

// Or use the default role (customer)
const { data, error } = await signUpWithRole(
  "customer@example.com",
  "password123"
);
```

Behind the scenes:

1. The role is stored in user metadata
2. Database triggers and functions ensure it's saved in the `user_roles` table
3. The custom access token hook adds this role to JWT claims

### Updating Roles

To update a user's role after signup:

```typescript
import { updateUserRole } from "../utils/userRoleManager";

// Update a user to admin role
const { success, error } = await updateUserRole(userId, "admin");

if (success) {
  console.log("User role updated successfully!");
} else {
  console.error("Failed to update role:", error);
}
```

This function:

1. Uses the `update_user_role_safe` RPC function to update the `user_roles` table
2. Updates the user's metadata for client-side access
3. Refreshes the session to update JWT claims

## How It Works

### Database Layer

1. **User Roles Table**: The `user_roles` table is the source of truth for role assignments
2. **Sync Mechanisms**: Triggers keep `user_roles` and `profiles` in sync for backward compatibility
3. **Custom Access Token Hook**: Reads from `user_roles` to add role claims to JWT tokens
4. **Helper RPC Functions**: Makes it easy to check and update roles directly from the database

### JWT Claims

The custom access token hook adds roles to your JWT in two places:

1. `user_role` - Standard claim location per Supabase docs
2. `app_metadata.role` - Common location for backward compatibility

### Client-Side Access

To access the user's role in your React components:

```typescript
import { getUserRole, getRoleFromJWT } from "../utils/userRoleManager";

// Method 1: Get role from JWT (fastest, but might be outdated)
const jwtRole = await getRoleFromJWT();
console.log("Role from JWT:", jwtRole);

// Method 2: Get role from database (most up-to-date)
const role = await getUserRole();
console.log("Role from database:", role);
```

### Row-Level Security (RLS)

In database RLS policies, you can use the helper functions:

```sql
-- Allow only admins to delete services
CREATE POLICY "Only admins can delete services"
ON services
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Allow technicians to update assigned jobs
CREATE POLICY "Technicians can update assigned jobs"
ON jobs
FOR UPDATE
TO authenticated
USING (public.is_technician() AND assigned_to = auth.uid());
```

## Key Benefits of This Approach

1. **Official Supabase Pattern**: Following Supabase's recommended approach for RBAC
2. **Dedicated Table**: `user_roles` table designed specifically for role management
3. **Better Performance**: Optimized queries for role checks with helper functions
4. **Backward Compatibility**: Still works with existing profile-based role checks

## Best Practices

1. **Use Helper Functions**: Always use the provided helper functions in `userRoleManager.ts` and RPC functions
2. **Refresh After Updates**: Always refresh the session after updating roles
3. **Single Source of Truth**: The `user_roles` table is now the source of truth for roles
4. **Check Efficiently**: Use JWT claims for quick checks, but verify with database for sensitive operations

## Troubleshooting

If roles aren't working correctly:

1. **Check JWT Claims**: Use browser devtools to decode and inspect JWT tokens
2. **Check User Roles Table**: Verify the role exists in the `user_roles` table
3. **Refresh Session**: Force a token refresh with `refreshJWTClaims()`
4. **Check Hook Configuration**: Ensure the custom access token hook is enabled in the Supabase Dashboard
