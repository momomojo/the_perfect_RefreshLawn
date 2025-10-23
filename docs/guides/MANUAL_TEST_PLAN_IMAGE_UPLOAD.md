# MANUAL TEST PLAN: Technician Image Upload Workflow

## RefreshLawn QA Testing - Critical Bug Fixes Verification

**Test Date**: 2025-10-17
**Tested By**: Manual QA Agent
**Test Environment**: Local Development (http://localhost:8082)
**Backend**: Supabase Production (iqxdatlqgvdcvyfdxywf.supabase.co)

---

## PRE-TEST VERIFICATION ✅

### Backend Status: VERIFIED

- ✅ Schema columns correct: `storage_path` and `uploaded_at` exist
- ✅ No legacy columns: `image_url` and `created_at` removed
- ✅ Test booking exists: `b5e72fd0-e51c-4689-a1dd-e82ac712fc51`
- ✅ Booking status: `in_progress` (ready for testing)
- ✅ Assigned technician: `a03bdaa0-3a90-42d5-a905-3dfc5bea29c9`
- ✅ No existing photos in database (clean slate)
- ✅ Login credentials verified working

### Test Credentials

**Technician Account**:

- Email: mohibhafeez@gmail.com
- Password: a1b2c3d4
- User ID: a03bdaa0-3a90-42d5-a905-3dfc5bea29c9
- Role: technician (verified in JWT)

**Test Booking**:

- Booking ID: b5e72fd0-e51c-4689-a1dd-e82ac712fc51
- Status: in_progress
- Scheduled Date: 2025-10-20
- Service ID: 3c7c3f3f-5e3a-4e9d-8e9c-8298b4f3ff65

---

## TEST SCENARIO 1: Single Database Insert (CRITICAL) 🔴

### Objective

Verify the duplicate insert bug is FIXED - each photo upload creates exactly ONE database record.

### Bug Context

**Previous Behavior**: Each photo upload created 2 identical rows in `booking_images` table due to duplicate `uploadPhoto()` calls in `JobStatusUpdater.tsx` (lines 414-437).

**Expected Fix**: Lines 414-437 removed, only one insert per upload.

### Test Steps

1. **Navigate to Web App**

   ```
   URL: http://localhost:8082
   ```

2. **Login as Technician**
   - Email: `mohibhafeez@gmail.com`
   - Password: `a1b2c3d4`
   - ✅ Verify successful login
   - ✅ Verify redirect to technician dashboard

3. **Navigate to Test Booking**
   - Find "Jobs" or "My Jobs" menu item
   - Click to view job list
   - Locate booking with scheduled date "2025-10-20"
   - Click to open booking details
   - ✅ **SCREENSHOT 1**: Booking detail page showing status "in_progress"

4. **Locate Photo Upload Section**
   - Scroll to photo upload area
   - Verify two sections exist: "Before Photos" and "After Photos"
   - ✅ **SCREENSHOT 2**: Photo upload interface (before any uploads)

5. **Upload First Before Photo**
   - Click "Add Photo" or "Upload" button in "Before Photos" section
   - Select any test image from your computer
   - Wait for upload to complete
   - ✅ **SCREENSHOT 3**: Success notification toast
   - ✅ Verify toast message: "Before photo uploaded successfully!"
   - ✅ **SCREENSHOT 4**: Photo appears in before photos gallery

6. **Database Verification - Check for Duplicates** (CRITICAL)

   Run this SQL query immediately after upload:

   ```sql
   -- Check for duplicate storage_paths (MUST return 0 rows)
   SELECT storage_path, COUNT(*) as count
   FROM booking_images
   WHERE booking_id = 'b5e72fd0-e51c-4689-a1dd-e82ac712fc51'
   GROUP BY storage_path
   HAVING COUNT(*) > 1;
   ```

   **Expected Result**: Empty result set (no duplicates)

   ```sql
   -- Verify single record created
   SELECT id, storage_path, type, uploaded_by, uploaded_at
   FROM booking_images
   WHERE booking_id = 'b5e72fd0-e51c-4689-a1dd-e82ac712fc51'
   ORDER BY uploaded_at DESC;
   ```

   **Expected Result**: Exactly 1 row with:
   - `storage_path`: booking-images/{booking_id}/before/{filename}
   - `type`: 'before'
   - `uploaded_by`: 'a03bdaa0-3a90-42d5-a905-3dfc5bea29c9'
   - `uploaded_at`: Recent timestamp

7. **Upload Second Before Photo** (Additional Verification)
   - Upload another different image to "Before Photos"
   - Wait for success notification
   - ✅ **SCREENSHOT 5**: Second photo in gallery

8. **Final Database Check**

   ```sql
   SELECT storage_path, COUNT(*) as count
   FROM booking_images
   WHERE booking_id = 'b5e72fd0-e51c-4689-a1dd-e82ac712fc51'
   GROUP BY storage_path
   HAVING COUNT(*) > 1;
   ```

   **Expected Result**: Still empty (no duplicates for either photo)

   **Total Record Count**: Should be exactly 2 rows

### Success Criteria ✅

- [ ] Success toast appears for each upload
- [ ] Photos appear in gallery immediately
- [ ] Database query shows ZERO duplicate `storage_path` values
- [ ] Each upload creates exactly 1 database record
- [ ] Records have `storage_path` column (not `image_url`)
- [ ] Records have `uploaded_at` column (not `created_at`)
- [ ] No JavaScript errors in browser console

### Failure Indicators ❌

- [ ] Error toast: "Image uploaded but failed to record in database"
- [ ] Database shows 2 rows with identical `storage_path`
- [ ] SQL error: "column image_url does not exist"
- [ ] SQL error: "column created_at does not exist"
- [ ] Console error mentioning `JobStatusUpdater` or `uploadPhoto`

### SQL Verification Commands

```bash
# Run from bash to check for duplicates
curl --ssl-no-revoke -X POST "https://iqxdatlqgvdcvyfdxywf.supabase.co/rest/v1/rpc/sql_query" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT storage_path, COUNT(*) as count FROM booking_images WHERE booking_id = '\''b5e72fd0-e51c-4689-a1dd-e82ac712fc51'\'' GROUP BY storage_path HAVING COUNT(*) > 1"}'
```

---

## TEST SCENARIO 2: Photo Requirement Validation (HIGH PRIORITY) 🟡

### Objective

Verify jobs cannot be completed without required before AND after photos.

### Test Steps

1. **Start Fresh** (if continuing from Test 1, skip to step 3)
   - Login as technician (mohibhafeez@gmail.com)
   - Navigate to test booking (b5e72fd0-e51c-4689-a1dd-e82ac712fc51)

2. **Ensure Clean State**
   - If photos exist from Test 1, delete them all
   - Verify both "Before Photos" and "After Photos" sections are empty
   - ✅ **SCREENSHOT 6**: Empty photo state

3. **Attempt Completion Without Photos**
   - Locate status dropdown or "Submit Job Report" button
   - Change status to "Completed" OR click submit button
   - ✅ **SCREENSHOT 7**: Error notification appears
   - ✅ Verify error message: "Please upload at least one before photo to complete the job."

4. **Upload Only Before Photo**
   - Upload 1 photo to "Before Photos" section
   - Wait for success notification
   - Attempt to complete job again
   - ✅ **SCREENSHOT 8**: New error notification
   - ✅ Verify error message: "Please upload at least one after photo to complete the job."

5. **Upload After Photo**
   - Upload 1 photo to "After Photos" section
   - Wait for success notification
   - Attempt to complete job again
   - ✅ **SCREENSHOT 9**: Confirmation dialog appears
   - ✅ Verify dialog message: "Are you sure you want to submit this job report?"

6. **Cancel Confirmation**
   - Click "Cancel" button in dialog
   - Verify status remains "in_progress"
   - ✅ **SCREENSHOT 10**: Job still in progress state

### Success Criteria ✅

- [ ] Error shown when no before photos present
- [ ] Error shown when no after photos present
- [ ] Confirmation dialog shown when both photo types present
- [ ] Job does NOT submit without both photo types
- [ ] Error messages are clear and specific
- [ ] Cancel button in confirmation works

### Failure Indicators ❌

- [ ] No validation errors shown
- [ ] Job can be completed without photos
- [ ] No confirmation dialog appears
- [ ] Generic error message instead of specific guidance

---

## TEST SCENARIO 3: Photo Deletion Confirmation (HIGH PRIORITY) 🟡

### Objective

Verify accidental photo deletions are prevented with confirmation dialogs.

### Test Steps

1. **Ensure Photos Exist**
   - If continuing from Test 2, you should have 1 before and 1 after photo
   - If not, upload at least 1 photo to any section

2. **Initiate Photo Deletion**
   - Locate a photo in the gallery
   - Find the delete button (usually X icon or trash icon on photo)
   - Click the delete button
   - ✅ **SCREENSHOT 11**: Confirmation dialog appears

3. **Verify Confirmation Message**
   - Check dialog text contains:
     - "Are you sure you want to delete this [before/after] photo?"
     - "This action cannot be undone."
   - ✅ Verify two buttons: "Cancel" and "Delete" (or "Confirm")

4. **Test Cancel Functionality**
   - Click "Cancel" button
   - ✅ **SCREENSHOT 12**: Photo still visible in gallery
   - ✅ Verify photo was NOT removed

5. **Test Delete Functionality**
   - Click delete button on the same photo again
   - Click "Delete" or "Confirm" in dialog
   - ✅ **SCREENSHOT 13**: Success notification
   - ✅ Verify toast: "[Before/After] photo removed successfully."
   - ✅ **SCREENSHOT 14**: Photo is gone from gallery

6. **Database Verification**

   ```sql
   SELECT COUNT(*) as remaining_photos
   FROM booking_images
   WHERE booking_id = 'b5e72fd0-e51c-4689-a1dd-e82ac712fc51';
   ```

   **Expected**: Count reduced by 1

### Success Criteria ✅

- [ ] Confirmation dialog appears before deletion
- [ ] Dialog message is clear and specific (mentions before/after)
- [ ] Cancel button preserves the photo
- [ ] Delete button removes the photo
- [ ] Success notification appears after deletion
- [ ] Photo visually disappears from UI
- [ ] Database record deleted (verified via SQL)

### Failure Indicators ❌

- [ ] Photo deleted immediately without confirmation
- [ ] No success notification after deletion
- [ ] Photo still in database after deletion
- [ ] Photo still visible in UI after deletion

---

## TEST SCENARIO 4: Complete End-to-End Workflow (RECOMMENDED) 🟢

### Objective

Verify entire workflow from fresh login to job completion with all features working together.

### Test Steps

1. **Fresh Start**
   - If logged in, log out completely
   - Clear browser cache/storage (optional but recommended)
   - Navigate to http://localhost:8082

2. **Login Flow**
   - Enter email: mohibhafeez@gmail.com
   - Enter password: a1b2c3d4
   - Click login
   - ✅ **SCREENSHOT 15**: Successful login, technician dashboard visible

3. **Navigate to Jobs**
   - Find and click "Jobs" or "My Jobs" navigation item
   - ✅ **SCREENSHOT 16**: Job list view
   - Verify test booking appears (scheduled 2025-10-20)

4. **Open Test Booking**
   - Click on the test booking
   - ✅ **SCREENSHOT 17**: Booking detail page
   - Verify status shows "in_progress"
   - Verify customer info visible
   - Verify service details visible

5. **Upload Before Photos (2 photos)**
   - Click "Add Photo" in Before Photos section
   - Select first image
   - Wait for success toast
   - ✅ **SCREENSHOT 18**: First before photo uploaded
   - Click "Add Photo" again
   - Select second image
   - Wait for success toast
   - ✅ **SCREENSHOT 19**: Second before photo uploaded
   - Verify both photos visible in gallery

6. **Upload After Photos (2 photos)**
   - Click "Add Photo" in After Photos section
   - Select third image
   - Wait for success toast
   - ✅ **SCREENSHOT 20**: First after photo uploaded
   - Click "Add Photo" again
   - Select fourth image
   - Wait for success toast
   - ✅ **SCREENSHOT 21**: Second after photo uploaded
   - Verify both photos visible in gallery

7. **Add Job Notes** (if feature exists)
   - Locate notes/comments field
   - Enter: "QA Test - All fixes verified working correctly"
   - ✅ **SCREENSHOT 22**: Notes entered

8. **Submit Job Report**
   - Find status dropdown or "Submit Job Report" button
   - Change status to "Completed"
   - ✅ **SCREENSHOT 23**: Confirmation dialog appears
   - Verify dialog message
   - Click "Submit" or "Confirm"
   - Wait for processing
   - ✅ **SCREENSHOT 24**: Success notification
   - Verify redirect or status update

9. **Verify Job Completion**
   - Navigate back to jobs list
   - ✅ **SCREENSHOT 25**: Test booking no longer in "In Progress" section
   - Find completed jobs section
   - Locate test booking in completed section
   - Click to open

10. **Verify Completed Job View**
    - ✅ **SCREENSHOT 26**: Completed job detail
    - Verify status shows "completed"
    - Verify all 4 photos visible (2 before, 2 after)
    - Verify notes visible
    - Verify completion timestamp

11. **Database Final Verification**

    ```sql
    SELECT b.id, b.status, bi.type, bi.storage_path, bi.uploaded_at
    FROM bookings b
    LEFT JOIN booking_images bi ON b.id = bi.booking_id
    WHERE b.id = 'b5e72fd0-e51c-4689-a1dd-e82ac712fc51'
    ORDER BY bi.type, bi.uploaded_at;
    ```

    **Expected Results**:
    - Booking status = 'completed'
    - 4 total rows returned (2 before, 2 after)
    - All rows have unique `storage_path` values (NO DUPLICATES)
    - All rows have `uploaded_at` timestamps
    - All rows have `uploaded_by` = 'a03bdaa0-3a90-42d5-a905-3dfc5bea29c9'

12. **Check for Duplicates One Final Time**

    ```sql
    SELECT storage_path, COUNT(*) as count
    FROM booking_images
    WHERE booking_id = 'b5e72fd0-e51c-4689-a1dd-e82ac712fc51'
    GROUP BY storage_path
    HAVING COUNT(*) > 1;
    ```

    **Expected**: Empty result set (zero duplicates)

### Success Criteria ✅

- [ ] Login works smoothly
- [ ] Job list displays correctly
- [ ] Booking details load completely
- [ ] All 4 photo uploads succeed
- [ ] Success toasts appear for each upload
- [ ] Photos visible in gallery immediately
- [ ] Job notes save correctly
- [ ] Validation prevents premature completion
- [ ] Confirmation dialog appears
- [ ] Job submits successfully
- [ ] Status updates to completed
- [ ] Completed job shows all photos
- [ ] Database has exactly 4 records (no duplicates)
- [ ] Zero JavaScript errors in console
- [ ] Zero network errors in Network tab

### Failure Indicators ❌

- [ ] Any photo upload fails
- [ ] Success toast doesn't appear
- [ ] Photos don't appear in gallery
- [ ] Duplicate records in database
- [ ] Cannot complete job
- [ ] No confirmation dialog
- [ ] Status doesn't update
- [ ] Photos disappear after completion
- [ ] Console errors present
- [ ] Network errors (401, 403, 500, etc.)

---

## TEST SCENARIO 5: Storage RLS Security (CRITICAL - Optional) 🔴

### Objective

Verify Row-Level Security policies prevent unauthorized photo uploads.

### Prerequisites

This test requires either:

- A second technician account (not assigned to the test booking), OR
- A customer or admin account

**Note**: If you don't have a second technician account, you can create one OR skip this test and document as "Not Tested - No Secondary Account Available"

### Test Steps

#### Option A: Second Technician Account

1. **Create Second Technician** (if needed)
   - Use Supabase Admin to create new user
   - Set role to 'technician'
   - Note credentials

2. **Logout Current Session**
   - Logout from mohibhafeez@gmail.com
   - Clear session storage

3. **Login as Second Technician**
   - Login with second technician credentials
   - Navigate to jobs list

4. **Attempt Unauthorized Access**
   - Try to navigate directly to booking:
     ```
     http://localhost:8082/booking/b5e72fd0-e51c-4689-a1dd-e82ac712fc51
     ```
   - OR search for the booking in job list

5. **Verify Access Control**
   - ✅ **SCREENSHOT 27**: Should NOT see booking in list
   - OR ✅ **SCREENSHOT 28**: Access denied error if navigating directly

6. **Attempt Photo Upload** (if somehow able to access booking)
   - Try to upload a photo
   - ✅ **SCREENSHOT 29**: RLS policy error
   - Verify error mentions "policy" or "permission denied"

#### Option B: Customer Account

1. **Logout and Login as Customer**
   - Logout from technician account
   - Login with customer account

2. **Attempt Technician Features**
   - Try to navigate to technician screens
   - ✅ Verify redirect to customer screens
   - ✅ Verify no access to photo upload features

### Database RLS Policy Verification

Run these queries to verify RLS policies are active:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'booking_images';
```

**Expected**: `rowsecurity = true`

```sql
-- List all policies on booking_images
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'booking_images';
```

**Expected**: At least 4 policies including:

- INSERT policy (only assigned technician)
- SELECT policy (assigned technician + customer)
- UPDATE policy (only assigned technician)
- DELETE policy (only assigned technician)

### Success Criteria ✅

- [ ] RLS is enabled on booking_images table
- [ ] 4+ RLS policies exist
- [ ] Unauthorized technician CANNOT upload photos
- [ ] Unauthorized technician CANNOT view photos
- [ ] Error message indicates policy violation
- [ ] Assigned technician CAN still upload photos

### Failure Indicators ❌

- [ ] RLS not enabled
- [ ] Any technician can upload to any booking (CRITICAL SECURITY BREACH!)
- [ ] No error when unauthorized user attempts upload
- [ ] Policies allow overly broad access

---

## BROWSER CONSOLE MONITORING

Throughout ALL tests, monitor the browser console (F12) for:

### Expected Console Output

- Network requests to Supabase Storage (successful uploads)
- Network requests to Supabase Database (successful inserts)
- Possibly: React Native Web rendering messages

### RED FLAGS (Report Immediately)

- ❌ `POST /storage/v1/object/booking-images` failing (401, 403, 500)
- ❌ `POST /rest/v1/booking_images` failing
- ❌ JavaScript errors mentioning `JobStatusUpdater`
- ❌ `TypeError: Cannot read property 'uploadPhoto'`
- ❌ `Column "image_url" does not exist`
- ❌ `Column "created_at" does not exist`
- ❌ Multiple identical insert requests (indicates duplicate calls)
- ❌ CORS errors
- ❌ Authentication errors (401 Unauthorized)

---

## NETWORK TAB MONITORING

Monitor Network tab (F12 → Network) for:

### Expected Behavior

- `POST /storage/v1/object/booking-images/{path}` → 200 OK
- `POST /rest/v1/booking_images` → 201 Created
- `GET /rest/v1/booking_images?booking_id=eq.{id}` → 200 OK

### RED FLAGS

- ❌ Duplicate POST requests to `/rest/v1/booking_images` for same upload
- ❌ 401 Unauthorized responses
- ❌ 403 Forbidden responses (RLS policy blocking)
- ❌ 500 Internal Server Error
- ❌ Request payloads containing `image_url` instead of `storage_path`
- ❌ Request payloads containing `created_at` instead of `uploaded_at`

---

## POST-TEST CLEANUP

After completing all tests:

1. **Document Results**
   - Fill out checklist items
   - Save all screenshots
   - Copy SQL query results

2. **Reset Test Booking** (Optional)

   ```sql
   -- Delete all test photos
   DELETE FROM booking_images
   WHERE booking_id = 'b5e72fd0-e51c-4689-a1dd-e82ac712fc51';

   -- Reset booking status
   UPDATE bookings
   SET status = 'in_progress'
   WHERE id = 'b5e72fd0-e51c-4689-a1dd-e82ac712fc51';
   ```

3. **Delete Test Photos from Storage** (Optional)
   - Navigate to Supabase Dashboard
   - Storage → booking-images bucket
   - Delete folder: `b5e72fd0-e51c-4689-a1dd-e82ac712fc51/`

---

## REPORTING TEMPLATE

Use this template for each test scenario:

````markdown
### TEST SCENARIO {NUMBER}: {NAME}

**Status**: ✅ PASS / ❌ FAIL / ⚠️ PARTIAL / 🔄 NOT TESTED

**Execution Date**: YYYY-MM-DD HH:MM

**Test Duration**: {minutes}

**Screenshots Captured**: {count} screenshots

**Results**:

- [ ] All success criteria met
- [ ] No failure indicators present
- [ ] Console clean (no errors)
- [ ] Network requests successful
- [ ] Database state correct

**Findings**:
{Detailed observations, any unexpected behavior, performance notes}

**Database Query Results**:

```sql
{Paste actual query results here}
```
````

**Console Errors** (if any):

```
{Paste console errors here}
```

**Network Errors** (if any):

```
{Paste network errors here}
```

**Recommendation**:
{PASS TO PRODUCTION / REQUIRES FIXES / NEEDS INVESTIGATION}

````

---

## CRITICAL SUCCESS METRICS

For this test session to be considered SUCCESSFUL, ALL of the following MUST be true:

1. ✅ **Zero Duplicate Database Records**: Every query checking for duplicates returns empty
2. ✅ **Correct Schema Usage**: All records use `storage_path` and `uploaded_at` columns
3. ✅ **Photo Upload Success Rate**: 100% of photo uploads succeed
4. ✅ **Validation Working**: Jobs cannot complete without both photo types
5. ✅ **Confirmation Dialogs Present**: Deletions require confirmation
6. ✅ **RLS Policies Active**: Unauthorized users cannot upload photos
7. ✅ **Zero Console Errors**: No JavaScript errors in browser console
8. ✅ **Zero Network Errors**: No failed API requests
9. ✅ **UI/UX Smooth**: No flickering, loading states work correctly
10. ✅ **End-to-End Flow**: Complete workflow from login to job completion works

**If ANY critical metric fails, the test session is FAILED and bugs must be investigated.**

---

## QUICK REFERENCE: SQL VERIFICATION QUERIES

```sql
-- Check for duplicate storage paths (MUST BE EMPTY)
SELECT storage_path, COUNT(*) as count
FROM booking_images
WHERE booking_id = 'b5e72fd0-e51c-4689-a1dd-e82ac712fc51'
GROUP BY storage_path
HAVING COUNT(*) > 1;

-- View all photos for test booking
SELECT id, storage_path, type, uploaded_by, uploaded_at
FROM booking_images
WHERE booking_id = 'b5e72fd0-e51c-4689-a1dd-e82ac712fc51'
ORDER BY type, uploaded_at;

-- Count photos by type
SELECT type, COUNT(*) as count
FROM booking_images
WHERE booking_id = 'b5e72fd0-e51c-4689-a1dd-e82ac712fc51'
GROUP BY type;

-- Check booking status
SELECT id, status, updated_at
FROM bookings
WHERE id = 'b5e72fd0-e51c-4689-a1dd-e82ac712fc51';

-- Verify schema columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'booking_images'
AND column_name IN ('storage_path', 'uploaded_at', 'image_url', 'created_at');

-- Check RLS policies
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'booking_images';
````

---

**END OF MANUAL TEST PLAN**

**Next Steps**: Execute tests in browser and document results using the reporting template above.
