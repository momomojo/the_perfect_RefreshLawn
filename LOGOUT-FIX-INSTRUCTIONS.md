# How to Fix the Logout Issue

We've identified several issues causing problems with your logout functionality:

1. **Multiple Supabase client instances** due to imports from both `lib/supabase.ts` and `utils/supabase.ts`
2. **Incomplete session clearing** in the logout process
3. **Possible cached session data** in the browser

## Solution Steps

### Immediate Fix (For Testing)

1. **Access the force logout page** we created:
   - Navigate to: http://localhost:8081/force-logout
   - This will clear all session data and perform a complete logout

### Complete Fix (To Permanently Resolve)

1. **Update all imports** from `utils/supabase.ts` to `lib/supabase.ts`:

   - Run the PowerShell script we created:
     ```powershell
     .\scripts\update-supabase-imports.ps1
     ```
   - Alternatively, use the batch file to list files that need updating:
     ```cmd
     .\scripts\update-supabase-imports.bat
     ```
   - We've already updated a few critical files, but it's best to update all

2. **Clear browser storage**:

   - Open your browser's Developer Tools (F12)
   - Go to Application → Storage → Clear Site Data
   - This will remove any cached session data

3. **Restart your dev server**:
   ```
   npx expo start --clear
   ```

## What We Changed

1. Enhanced the `signOut` function in `lib/auth.tsx`:

   - Added more detailed logging for debugging
   - Improved error handling
   - Added global scope to force all sessions to be cleared
   - Added web-specific local storage clearing

2. Updated the Settings component:

   - Improved the logout confirmation dialog
   - Added better error handling

3. Created migration scripts:

   - PowerShell script for Windows users
   - Batch file alternative for diagnosis

4. Created a Force Logout page:
   - Direct access to complete logout functionality
   - Clears localStorage and performs a global signOut

## If Issues Persist

If you continue to experience logout issues:

1. Check your console for error messages or warnings about multiple GoTrueClient instances
2. Try accessing `/force-logout` directly
3. Verify that you're not importing from `utils/supabase.ts` anywhere in your code
4. Consider rebuilding your app from scratch using `expo prebuild --clean`

## Testing Your Fix

After implementing these changes, test the following:

1. Login as different user types (admin, technician, customer)
2. Use the logout button in each role's interface
3. Verify you're properly redirected to the login page
4. Try to navigate back and confirm you're not still authenticated
