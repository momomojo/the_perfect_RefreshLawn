# User Role Signup Guide for RefreshLawn

This guide explains how to properly sign up users with different roles in the RefreshLawn application.

## Understanding the Role Assignment Process

When a user signs up in RefreshLawn, the role assignment follows these steps:

1. **During Signup**: The role can be specified in the user's `raw_user_meta_data`
2. **Profile Creation**: A trigger creates a profile with the role from metadata (or defaults to 'customer')
3. **JWT Token**: The custom JWT hook adds the role to the token claims when the user logs in

## Frontend Implementation for Role-Based Signup

Here's how to implement role-based signup in your React Native app using Supabase:

### Customer Signup (Default)

For regular customer signup, no special handling is needed:

```typescript
// Regular customer signup
const { data, error } = await supabase.auth.signUp({
  email: "customer@example.com",
  password: "securepassword",
  options: {
    data: {
      first_name: "John",
      last_name: "Doe",
      // No role specified, will default to 'customer'
    },
  },
});
```

### Technician Signup

For technician signup, explicitly set the role:

```typescript
// Technician signup
const { data, error } = await supabase.auth.signUp({
  email: "technician@example.com",
  password: "securepassword",
  options: {
    data: {
      first_name: "Jane",
      last_name: "Smith",
      role: "technician", // Explicitly set the role
    },
  },
});
```

### Admin Signup

For admin signup, explicitly set the role:

```typescript
// Admin signup
const { data, error } = await supabase.auth.signUp({
  email: "admin@example.com",
  password: "securepassword",
  options: {
    data: {
      first_name: "Admin",
      last_name: "User",
      role: "admin", // Explicitly set the role
    },
  },
});
```

## Verifying User Roles

### Client-Side Role Verification

To check user roles in your React Native app:

```typescript
import { supabase } from "../lib/supabase";

// Get the current user's role
const getUserRole = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  // Check in both possible locations
  const role =
    session.user.app_metadata?.role ||
    session.user.user_metadata?.role ||
    "customer"; // Default to customer if no role found

  return role;
};

// Usage example
const role = await getUserRole();
if (role === "admin") {
  // Show admin features
} else if (role === "technician") {
  // Show technician features
} else {
  // Show customer features
}
```

### Server-Side Role Verification

On the server side (Supabase Edge Functions), you can verify roles using:

```typescript
// In a Supabase Edge Function
const getUserRole = (req: Request) => {
  const jwt = req.headers.get("Authorization")?.split("Bearer ")[1];
  if (!jwt) return null;

  try {
    // Decode the JWT (simplified, you should validate it properly)
    const payload = JSON.parse(atob(jwt.split(".")[1]));

    // Check both possible locations
    return payload.app_metadata?.role || payload.role || "customer"; // Default to customer
  } catch (e) {
    return null;
  }
};
```

## Troubleshooting

If user roles are not working as expected:

1. **JWT Hook Not Enabled**: Verify the custom JWT hook is enabled in the Supabase Dashboard
2. **Wrong Role Path**: Make sure you're checking for the role in both possible locations
3. **Role Not Set During Signup**: Verify the role is being correctly set in user metadata during signup
4. **Old Token**: Have users sign out and sign back in to get a fresh token with updated claims

## Testing Role Assignment

To test if role assignment is working correctly:

1. Create test users with different roles using the code examples above
2. Sign in with each user and check their role using the verification functions
3. Verify the roles in the Supabase Dashboard:
   - Check the `profiles` table to confirm the role is correctly set
   - Check `auth.users` to see if the role is in both metadata locations

Remember that after changes to role assignment logic, users need to sign out and sign back in to get a new JWT with the updated claims.
