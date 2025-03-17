# Role-Based Access Control (RBAC) Implementation Guide

This guide explains the RBAC implementation in RefreshLawn following Supabase's best practices.

## Overview

Role-Based Access Control (RBAC) is implemented using Supabase Auth Custom Claims. The system:

1. Stores user roles in the `profiles` table
2. Adds these roles to JWT tokens via a Custom Access Token Hook
3. Verifies roles using both server-side and client-side utilities

## Database Structure

- User roles are stored in the `profiles` table in the `role` column
- Valid roles are: `admin`, `technician`, and `customer`

## How It Works

### 1. User Signup

When a user signs up, we:

- Store their role in `user_metadata.role`
- A trigger creates a profile record with this role
- If no role is specified, it defaults to 'customer'

```typescript
// Example signup with role
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "password",
  options: {
    data: {
      role: "technician", // Can be 'admin', 'technician', or 'customer'
    },
  },
});
```

### 2. JWT Claims

The `custom_access_token_hook` function adds the role to the JWT token in two places:

- Standard location: `user_role` claim
- Common location: `app_metadata.role`

This makes it accessible in both server-side (RLS) and client-side code.

### 3. Role Verification

#### Server-Side (Database RLS Policies)

We provide utility functions for RLS policies:

- `auth.is_admin_jwt()` - Checks if user is admin
- `auth.is_technician_jwt()` - Checks if user is technician
- `auth.is_customer_jwt()` - Checks if user is customer
- `auth.user_role()` - Returns the user's role

Example RLS policy:

```sql
CREATE POLICY "Only admins can delete services"
ON services
FOR DELETE
TO authenticated
USING (auth.is_admin_jwt());
```

#### Client-Side (React Native)

We provide utility functions in `utils/roleUtils.ts`:

- `getUserRole()` - Gets the current user's role
- `isAdmin()` - Checks if user is admin
- `isTechnician()` - Checks if user is technician
- `isCustomer()` - Checks if user is customer

Example usage:

```typescript
import { isAdmin } from "../utils/roleUtils";

const AdminOnlyFeature = () => {
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  useEffect(() => {
    async function checkRole() {
      const admin = await isAdmin();
      setIsUserAdmin(admin);
    }
    checkRole();
  }, []);

  if (!isUserAdmin) return <Text>Access denied</Text>;

  return <Text>Admin-only content</Text>;
};
```

## Important Notes

1. **Proper JWT Decoding**: The client-side code uses `jwt-decode` to properly extract the `user_role` claim from the JWT.

2. **Role Refresh**: After changing a user's role, you must refresh their JWT token:

   ```typescript
   import { refreshUserSession } from "../utils/roleUtils";

   // After changing a user's role
   await refreshUserSession();
   ```

3. **Token Claims**: Remember that changes to user roles won't be reflected until the JWT token is refreshed.

## Implementation Details

Our implementation follows Supabase's best practices:

1. The custom access token hook is implemented without SECURITY DEFINER
2. Proper permissions are granted to supabase_auth_admin
3. JWT claims are standardized following Supabase documentation
4. Helper functions check multiple locations for backward compatibility

## Verifying the Implementation

You can verify the implementation is working by:

1. Creating users with different roles
2. Checking the JWT token contents (in browser dev tools):
   ```javascript
   const jwt = supabase.auth.session()?.access_token;
   const decoded = JSON.parse(atob(jwt.split(".")[1]));
   console.log(decoded);
   ```
3. Verifying RLS policies work correctly based on the user's role
