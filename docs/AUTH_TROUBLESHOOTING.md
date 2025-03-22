# Authentication Troubleshooting Guide for RefreshLawn

This document provides solutions for common authentication issues in the RefreshLawn application.

## Common Authentication Issues

### 1. Unable to Log Out

If you're having trouble logging out of the application, try these steps in order:

1. **Use the auth context's `signOut` function**
   - Always use `const { signOut } = useAuth()` from the auth context
   - Never call `supabase.auth.signOut()` directly in components

2. **Clear browser storage (Web only)**
   - Open Developer Tools (F12)
   - Go to Application → Storage → Clear Site Data
   - Close all browser tabs with the application

3. **Use the emergency logout page**
   - Navigate to `/force-logout` in the app
   - This page will clear all auth data and force a complete logout

4. **Restart the development server**
   ```bash
   npx expo start --clear
   ```

### 2. Multiple Supabase Client Instances

The application should use only one Supabase client to avoid authentication conflicts.

**How to fix:**

1. Run the import fix script:
   ```bash
   node scripts/fix-supabase-imports.js
   ```

2. **Always import from `lib/supabase.ts`**:
   ```typescript
   import { supabase } from "../lib/supabase";
   ```

3. **Never import from `utils/supabase.ts`** (deprecated)

### 3. Session Persistence Issues

The application uses `ENABLE_SESSION_PERSISTENCE` in `lib/supabase.ts` to control whether sessions are stored between app launches.

**Current setting:**
- `ENABLE_SESSION_PERSISTENCE = true` (users stay logged in between app restarts)

If you want to change this behavior:

1. Edit `lib/supabase.ts` and change the flag value
2. Restart the development server
3. Clear any stored sessions using the steps above

## Debugging Tools

The application includes several tools to help debug authentication issues:

1. **Force Logout Page** (`/force-logout`)
   - Clears all local storage and forces a complete logout

2. **JWT Debugger** (`/jwt-debugger`)
   - Examines the current JWT token claims
   - Helps diagnose role-based access issues

3. **Authentication Logger**
   - Check the browser console for auth-related log messages
   - Look for messages starting with "Auth:"

## Best Practices

1. **Always use the Auth Context**
   ```typescript
   const { user, signIn, signOut } = useAuth();
   ```

2. **Handle Authentication States Properly**
   ```typescript
   if (loading) return <LoadingSpinner />;
   if (!user) return <LoginScreen />;
   ```

3. **Check Roles Using Auth Context**
   ```typescript
   const { isAdmin, isCustomer, isTechnician } = useAuth();
   
   if (isAdmin) {
     // Show admin features
   }
   ```

4. **Avoid Direct Supabase Auth API Calls**
   - Don't call `supabase.auth.signIn()` or `supabase.auth.signOut()` directly
   - Use the auth context methods instead

## Architecture Overview

The authentication system consists of:

1. **Auth Context Provider** (`lib/auth.tsx`)
   - Manages auth state, user roles, and authentication methods
   - Handles session persistence and token refresh

2. **Supabase Client** (`lib/supabase.ts`)
   - Single source of truth for the Supabase client
   - Configures storage adapters based on environment

3. **Session Storage**
   - Web: LocalStorage/SessionStorage
   - Native: AsyncStorage (dev) or SecureStore (prod)

## Common Error Messages

| Error Message | Potential Solution |
|--------------|-------------------|
| "Failed to logout" | Use the `/force-logout` page to clear all session data |
| "JWT expired" | Your session has expired - sign in again |
| "Network request failed" | Check your internet connection |
| "Multiple GoTrueClient instances detected" | Fix imports using the script |

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Expo Authentication Guide](https://docs.expo.dev/guides/authentication/) 