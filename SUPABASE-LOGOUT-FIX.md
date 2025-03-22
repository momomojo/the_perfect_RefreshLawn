# Supabase Authentication & Logout Fix Plan

## Issues Identified

1. **Multiple GoTrueClient Instances**: The application had two separate Supabase client initializations:
   - `lib/supabase.ts` with session persistence enabled
   - `utils/supabase.ts` with session persistence disabled
2. **Inconsistent Logout Handling**: Different components were using different methods to log out:
   - Settings component directly calling `supabase.auth.signOut()`
   - ProfileSettings component using the auth context's `signOut` function

## Changes Made

1. **Consolidated Supabase Client**:

   - Updated `lib/supabase.ts` to be the single source of truth for the Supabase client
   - Created a deprecation notice in `utils/supabase.ts` that re-exports from `lib/supabase.ts`

2. **Improved Auth Context**:

   - Enhanced the `signOut` function with additional debugging and safeguards
   - Added a web-specific force reload to ensure the session is properly cleared

3. **Updated Settings Component**:
   - Modified the admin settings to use the auth context's `signOut` function

## Remaining Steps

1. **Update Import Statements**:

   - Update all components that import from `utils/supabase.ts` to import from `lib/supabase.ts` instead
   - Use the following command to find components that need to be updated:
     ```
     grep -r "from ['\"].*utils/supabase['\"]" --include="*.tsx" --include="*.ts" ./app ./components ./lib ./utils
     ```

2. **Clear Local Storage**:

   - If testing in a browser, clearing local storage can help resolve lingering session issues
   - Open Developer Tools > Application > Storage > Local Storage > Clear

3. **Update Other Logout Functions**:

   - Check all components with logout functionality to ensure they use the auth context's `signOut` function
   - This includes `ProfileSettings.tsx`, `TechnicianProfile.tsx`, and any other components with logout buttons

4. **Session Management Best Practices**:

   - Ensure only one instance manages session persistence
   - Avoid manual session clearing except in the main auth context

5. **Environment Variable Handling**:
   - Update the application to use a consistent method for accessing environment variables

## Testing

After making these changes, you should test the following scenarios:

1. **Login & Logout Flow**:

   - Login as an admin, technician, and customer
   - Verify that logout works correctly for each user type
   - Check that after logout, the user is redirected to the login page

2. **Session Persistence**:

   - Verify that sessions persist correctly between page refreshes
   - Ensure that logging out correctly clears the session

3. **Error Handling**:
   - Test error scenarios to ensure they're handled gracefully

## Future Improvements

1. **Token Refresh Management**:

   - Implement better handling of token refresh errors
   - Add automatic retry mechanisms

2. **Offline Support**:

   - Consider adding offline support with queued authentication actions

3. **Session Monitoring**:
   - Add more robust session monitoring to detect and prevent issues

## Conclusion

By consolidating the Supabase client and ensuring consistent logout handling, the authentication issues should be resolved. If you encounter any remaining problems, check the console logs for warnings or errors and address the specific components that are still causing issues.
