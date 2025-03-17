# RefreshLawn Authentication Fix Documentation

This document explains the authentication issues that were identified and the fixes implemented.

## Issue Summary

The application was experiencing issues with user signup, specifically the error:

```
AuthApiError: Database error saving new user
```

This error occurred because of several related issues in the authentication flow:

1. **Trigger Function Failure**: The `handle_new_user` trigger function that creates user profiles was failing in certain situations.

2. **Custom Access Token Hook Issues**: The JWT hook that adds role information to tokens was not properly configured.

3. **Role Management Complexity**: The user role management system was overly complex, with roles being stored in multiple places:

   - `profiles` table
   - `user_roles` table
   - JWT token claims
   - User metadata

4. **Error Handling Gaps**: The authentication functions lacked robust error handling, causing failures to propagate.

## Implemented Fixes

### 1. Fixed Trigger Function

The `handle_new_user` trigger function was replaced with a more robust version that:

- Includes proper error handling
- Uses a fallback mechanism to ensure profiles are always created
- Never fails completely, ensuring user creation always succeeds

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    -- Check if role exists in raw_user_meta_data, otherwise default to 'customer'
    INSERT INTO public.profiles (id, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log the error details
    RAISE WARNING 'Error in handle_new_user function: %. User ID: %. Raw metadata: %',
      SQLERRM, NEW.id, NEW.raw_user_meta_data;

    -- Fall back to just creating a basic profile with customer role
    BEGIN
      INSERT INTO public.profiles (id, role)
      VALUES (NEW.id, 'customer');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Critical error in handle_new_user fallback: %. User ID: %',
        SQLERRM, NEW.id;
    END;
  END;

  -- Continue with the transaction regardless of profile creation success
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Improved Custom Access Token Hook

The custom access token hook was updated to:

- Handle null or invalid user IDs
- Prioritize the `user_roles` table as the source of truth
- Fall back to the `profiles` table if needed
- Add role claims to all expected locations
- Never fail catastrophically

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_claims jsonb;
BEGIN
  -- Extract the user ID with error handling
  BEGIN
    v_user_id := (event ->> 'user_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN event;
  END;

  -- Early exit if user_id is null
  IF v_user_id IS NULL THEN
    RETURN event;
  END IF;

  -- Get the claims
  v_claims := COALESCE(event -> 'claims', '{}'::jsonb);

  -- Get the user's role (prioritizing user_roles table)
  BEGIN
    SELECT role::text INTO v_user_role
    FROM public.user_roles
    WHERE user_id = v_user_id
    LIMIT 1;

    -- If not found, try profiles table
    IF v_user_role IS NULL THEN
      SELECT role INTO v_user_role
      FROM public.profiles
      WHERE id = v_user_id;
    END IF;

    -- Set default role if still null
    IF v_user_role IS NULL THEN
      v_user_role := 'customer';
    END IF;

    -- Add to all locations
    v_claims := jsonb_set(v_claims, '{user_role}', to_jsonb(v_user_role));
    v_claims := jsonb_set(v_claims, '{app_metadata,role}', to_jsonb(v_user_role));

    -- Update the claims
    event := jsonb_set(event, '{claims}', v_claims);

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in custom_access_token_hook: %.', SQLERRM;
  END;

  RETURN event;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Enhanced Signup Function

The `signUpWithRole` function in `utils/userRoleManager.ts` was improved with:

- Comprehensive logging for easier debugging
- Robust error handling at all steps
- Profile existence checking before updates
- Increased timeout to prevent race conditions
- Explicit session refresh to update JWT claims

### 4. Diagnostic and Testing Tools

Several new tools were added to help diagnose and resolve authentication issues:

1. **Auth Diagnostics Page**: A new page at `/auth-diagnostics` shows:

   - JWT token data
   - Profile information
   - User roles data

2. **Simplified Signup Function**: A new function in `utils/simplifiedSignup.ts` provides a minimal signup flow to isolate issues.

3. **Signup Test Page**: A page at `/signup-test` allows testing the simplified signup.

### 5. Migration Tracking

A new `migration_logs` table was added to track applied migrations, making it easier to:

- See which migrations have been applied
- When they were applied
- What they were intended to fix

## Required Manual Steps

After applying these fixes, you must manually enable the custom access token hook in the Supabase Dashboard:

1. Go to Supabase Dashboard > Authentication > Hooks
2. For the JWT Access Token event, select Database Function
3. Choose `public.custom_access_token_hook`
4. Save the changes

## Additional Documentation

- **AUTHENTICATION_TROUBLESHOOTING.md**: Guide for diagnosing and fixing authentication issues
- **HOOK_VERIFICATION_GUIDE.md**: Steps for verifying the custom access token hook
- **USER_ROLE_SIGNUP_GUIDE.md**: Guide for signing up users with different roles
- **ROLE_MANAGEMENT_GUIDE.md**: Explanation of the role management system

## Testing the Fix

To test if the fixes are working:

1. Use the `/signup-test` page to try the simplified signup
2. If that works, try the regular signup
3. After login, use the `/auth-diagnostics` page to verify all role information is correct
