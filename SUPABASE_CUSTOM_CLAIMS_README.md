# Supabase Custom Claims Implementation

This project uses the official [Supabase Custom Claims](https://github.com/supabase-community/supabase-custom-claims) implementation to manage user claims.

## What are Custom Claims?

Custom Claims are special attributes attached to a user that can be used to control access to portions of your application. Examples include:

```json
{
  "role": "admin",
  "plan": "pro",
  "access_level": 5,
  "permissions": ["read", "write", "delete"]
}
```

These claims are stored in the `raw_app_meta_data` field of the `auth.users` table and are included in the JWT token that authenticated users receive.

## Implementation Steps

The implementation has been set up using the following steps:

1. **Database Functions**: SQL functions for managing claims have been added to the database as migrations:

   - `is_claims_admin()`: Checks if the current user can manage claims
   - `get_my_claims()`: Gets all claims for the current user
   - `get_my_claim(claim TEXT)`: Gets a specific claim for the current user
   - `get_claims(uid uuid)`: Gets all claims for a specific user (admin only)
   - `get_claim(uid uuid, claim text)`: Gets a specific claim for a user (admin only)
   - `set_claim(uid uuid, claim text, value jsonb)`: Sets a claim for a user (admin only)
   - `delete_claim(uid uuid, claim text)`: Deletes a claim for a user (admin only)

2. **Client Functions**: TypeScript functions have been created in `utils/claimsManager.ts` to interact with these database functions.

## Setting Up an Admin User

To bootstrap your first admin user, you need to run the following SQL in the Supabase SQL Editor:

```sql
select set_claim('USER_UUID_HERE', 'claims_admin', 'true');
```

Replace `USER_UUID_HERE` with the UUID of the user you want to make an admin.

## Using Claims in Your Application

### Reading Claims from the Local Session

```typescript
import { getLocalClaims } from "utils/claimsManager";

const claims = await getLocalClaims();
console.log(claims); // Shows all claims from the session
```

### Getting Claims from the Server

```typescript
import { getMyClaimsFn, getMyClaimFn } from "utils/claimsManager";

// Get all claims
const { data: allClaims, error } = await getMyClaimsFn();

// Get a specific claim
const { data: roleClaim, error } = await getMyClaimFn("role");
```

### Managing Claims (Admin Only)

```typescript
import { setClaimFn, deleteClaimFn } from "utils/claimsManager";

// Set a claim (requires claims_admin: true)
await setClaimFn("USER_UUID", "role", '"admin"'); // String value
await setClaimFn("USER_UUID", "access_level", "5"); // Number value
await setClaimFn("USER_UUID", "is_active", "true"); // Boolean value

// Delete a claim
await deleteClaimFn("USER_UUID", "temporary_access");
```

### Refreshing Claims

If claims have changed, the user may need to refresh their session to see the updated claims:

```typescript
import { refreshClaims } from "utils/claimsManager";

await refreshClaims();
```

## Using Claims in RLS Policies

Example Row Level Security policies using claims:

```sql
-- Allow only users with the admin role
((get_my_claim('role')::text)) = '"admin"'::jsonb)

-- Allow users with access_level over 5
(coalesce(get_my_claim('access_level')::numeric, 0) > 5)

-- Allow only users with the claims_admin flag
coalesce(get_my_claim('claims_admin')::bool, false)
```
