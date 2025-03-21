# Authentication Persistence Management

## Current Setup

Authentication persistence has been temporarily disabled in the RefreshLawn app. This means that users will need to sign in each time they restart the app, as session information is not being stored between app launches.

## Why Disable Persistence?

During development and testing, it's sometimes preferable to have a clean authentication state on each app launch to test different user scenarios without having to explicitly log out.

## How it Works

The persistence is controlled via a simple flag in both Supabase client files:

1. `lib/supabase.ts`
2. `utils/supabase.ts`

Both files contain a constant called `ENABLE_SESSION_PERSISTENCE` which is currently set to `false`.

When this flag is disabled:

- A "no-op" storage adapter is used that doesn't actually store any data
- The `persistSession` option for Supabase Auth is set to `false`
- A helper function `clearStoredSession()` is called on app startup to clear any previously stored sessions

## Re-enabling Session Persistence

To re-enable the normal behavior where users stay logged in between app restarts:

1. Open `lib/supabase.ts` and change:

   ```typescript
   const ENABLE_SESSION_PERSISTENCE = false;
   ```

   to:

   ```typescript
   const ENABLE_SESSION_PERSISTENCE = true;
   ```

2. Make the same change in `utils/supabase.ts`

3. Rebuild and restart the app

## Testing Authentication

When testing authentication flows:

- With persistence disabled: The app will start fresh with no user logged in each time
- With persistence enabled: The previous user session will be restored on app launch

## Security Considerations

- In development builds, sessions are stored in AsyncStorage
- In production builds, sessions are stored in SecureStore for enhanced security
- When re-enabling persistence for production, ensure both files are updated
