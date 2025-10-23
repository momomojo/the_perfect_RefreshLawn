# QUICK START GUIDE: Manual Testing

## Technician Image Upload Workflow - 15-Minute Critical Test

**Use this guide if you have limited time and need to test the MOST CRITICAL functionality**

---

## ⚡ FASTEST PATH TO VERIFY FIX (10 Minutes)

### What You're Testing

**CRITICAL BUG**: Each photo upload was creating 2 duplicate database records.
**FIX APPLIED**: Code in `JobStatusUpdater.tsx` lines 414-437 removed.
**YOUR JOB**: Verify fix works - each upload creates exactly ONE record.

---

## 🚀 STEP-BY-STEP (Follow Exactly)

### Step 1: Open Web App (30 seconds)

```
1. Open browser (Chrome/Edge recommended)
2. Navigate to: http://localhost:8082
3. Press F12 to open DevTools
4. Click "Console" tab
5. Leave DevTools open (you'll need it)
```

### Step 2: Login (30 seconds)

```
Email: mohibhafeez@gmail.com
Password: a1b2c3d4

Click "Login" or "Sign In"
```

**✅ Expected**: Redirect to technician dashboard
**❌ If login fails**: Check console for errors, report to developer

### Step 3: Find Test Booking (1 minute)

```
1. Click "Jobs" or "My Jobs" in navigation
2. Look for booking scheduled "2025-10-20"
3. Should show service like "Basic Lawn Mowing"
4. Status should be "in_progress"
5. Click on this booking to open details
```

**✅ Expected**: Booking detail page opens
**❌ If not found**: Booking may have been deleted, check with developer

### Step 4: Upload FIRST Photo - CRITICAL TEST (2 minutes)

```
1. Find "Before Photos" section on page
2. Click "Add Photo" or "Upload" button
3. Select ANY image from your computer (doesn't matter which)
4. Wait for upload to complete (watch for toast notification)
```

**✅ Expected**:

- Toast notification: "Before photo uploaded successfully!"
- Photo appears in gallery
- No errors in console

**❌ RED FLAGS**:

- Error toast appears
- No toast at all
- Console error (red text in DevTools)
- Photo doesn't appear

**CRITICAL**: Proceed to Step 5 immediately (don't upload more yet!)

### Step 5: CHECK FOR DUPLICATES - MOST IMPORTANT STEP (2 minutes)

Open a new terminal/command prompt and run this SQL query:

**Option A - Using Bash/Command Line:**

```bash
# Copy this entire command and paste into terminal
curl --ssl-no-revoke -X POST "https://iqxdatlqgvdcvyfdxywf.supabase.co/rest/v1/rpc/execute_sql" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxeGRhdGxxZ3ZkY3Z5ZmR4eXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Njc2MzgsImV4cCI6MjA3NjA0MzYzOH0.cG7qVGB0HWA-9k4_92cRAJcZFTcdpnrYAey5fpFNIJY" \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT storage_path, COUNT(*) as count FROM booking_images WHERE booking_id = '\''b5e72fd0-e51c-4689-a1dd-e82ac712fc51'\'' GROUP BY storage_path HAVING COUNT(*) > 1"}'
```

**Option B - Using Supabase Dashboard:**

1. Open: https://supabase.com/dashboard/project/iqxdatlqgvdcvyfdxywf
2. Click "SQL Editor" in sidebar
3. Paste this query:

```sql
SELECT storage_path, COUNT(*) as count
FROM booking_images
WHERE booking_id = 'b5e72fd0-e51c-4689-a1dd-e82ac712fc51'
GROUP BY storage_path
HAVING COUNT(*) > 1;
```

4. Click "Run"

**✅ EXPECTED RESULT**: Empty result (no rows)

```
[]
```

or

```
(0 rows)
```

**❌ CRITICAL FAILURE**: If you see ANY rows, like this:

```json
[{ "storage_path": "booking-images/..../photo.jpg", "count": 2 }]
```

**= BUG STILL EXISTS! STOP TESTING! Report to developer immediately.**

### Step 6: Verify Single Record Created (1 minute)

Run this query to see the photo record:

```sql
SELECT id, storage_path, type, uploaded_at
FROM booking_images
WHERE booking_id = 'b5e72fd0-e51c-4689-a1dd-e82ac712fc51'
ORDER BY uploaded_at DESC;
```

**✅ EXPECTED**: Exactly 1 row returned

```json
[
  {
    "id": "some-uuid",
    "storage_path": "booking-images/b5e72fd0-.../before/some-filename.jpg",
    "type": "before",
    "uploaded_at": "2025-10-17T23:..."
  }
]
```

**✅ Check these things**:

- Exactly 1 row (not 2!)
- Column name is `storage_path` (not `image_url`)
- Column name is `uploaded_at` (not `created_at`)

**❌ FAILURE**: If you see 2 rows, or wrong column names, bug exists!

### Step 7: Upload SECOND Photo (2 minutes)

```
1. Click "Add Photo" in "Before Photos" again
2. Select a DIFFERENT image
3. Wait for success toast
4. Photo should appear in gallery
```

### Step 8: Re-Check for Duplicates (1 minute)

Run the duplicate check query again (from Step 5):

```sql
SELECT storage_path, COUNT(*) as count
FROM booking_images
WHERE booking_id = 'b5e72fd0-e51c-4689-a1dd-e82ac712fc51'
GROUP BY storage_path
HAVING COUNT(*) > 1;
```

**✅ EXPECTED**: Still empty (no duplicates)

**Count total records**:

```sql
SELECT COUNT(*) FROM booking_images
WHERE booking_id = 'b5e72fd0-e51c-4689-a1dd-e82ac712fc51';
```

**✅ EXPECTED**: `count = 2` (not 4!)

### Step 9: Quick Console Check (30 seconds)

Look at browser DevTools Console tab:

**✅ Good signs**:

- No red error messages
- Maybe some blue/gray info messages (OK)

**❌ Bad signs**:

- Red errors mentioning "JobStatusUpdater"
- Errors about "image_url" or "created_at" not existing
- Multiple POST requests to same endpoint

### Step 10: Network Tab Check (30 seconds)

In DevTools, click "Network" tab:

**Look for these requests** (filter by "booking_images"):

- Should see POST requests to `/rest/v1/booking_images`

**✅ Good**: Exactly 2 POST requests (one per photo)
**❌ Bad**: 4 POST requests (2 per photo = duplicate inserts)

Click on a POST request, click "Payload" or "Request":

**✅ Expected**: JSON contains `storage_path` and `uploaded_at`
**❌ Failure**: JSON contains `image_url` or `created_at`

---

## 📊 FINAL VERDICT

### ✅ TEST PASSED IF:

- [ ] Both photos uploaded successfully
- [ ] Duplicate check query returned EMPTY (no rows)
- [ ] Total record count = 2 (not 4)
- [ ] Records have `storage_path` and `uploaded_at` columns
- [ ] Console has no red errors
- [ ] Network shows 2 POST requests (not 4)

### ❌ TEST FAILED IF:

- [ ] Duplicate check query returned ANY rows
- [ ] Total record count = 4 (or anything other than 2)
- [ ] Records have `image_url` or `created_at` columns
- [ ] Console shows red errors
- [ ] Network shows 4+ POST requests for 2 uploads

---

## 🚨 IF TEST FAILS - DO THIS

1. **Take Screenshots**:
   - Screenshot of duplicate query result
   - Screenshot of console errors
   - Screenshot of network tab

2. **Copy Error Messages**:
   - Any red text from console
   - Any error toast messages
   - SQL error messages

3. **Document**:
   - How many photos uploaded: \_\_\_
   - How many database records: \_\_\_
   - Duplicate query result: \_\_\_

4. **Report to Developer**:
   - Share screenshots
   - Share error messages
   - Share duplicate query result

---

## 💡 BONUS TESTS (If You Have Extra Time)

### Test Photo Deletion (3 minutes)

```
1. Find one of the photos you uploaded
2. Click delete/X button on the photo
3. SHOULD SEE: Confirmation dialog
4. Click "Cancel" → photo should stay
5. Click delete again
6. Click "Confirm" → photo should disappear
7. Check database: count should be 1 now
```

### Test Job Completion Validation (3 minutes)

```
1. Try to change job status to "Completed"
2. SHOULD SEE: Error - "Please upload at least one after photo"
3. Upload 1 "After" photo
4. Try to complete again
5. SHOULD SEE: Confirmation dialog
6. Click confirm
7. Job should complete successfully
```

---

## 📞 QUICK REFERENCE

### Login Credentials

```
Email: mohibhafeez@gmail.com
Password: a1b2c3d4
```

### Web App

```
http://localhost:8082
```

### Booking ID to Test

```
b5e72fd0-e51c-4689-a1dd-e82ac712fc51
```

### Critical SQL Query (Copy-Paste Ready)

```sql
-- Check for duplicates (MUST BE EMPTY)
SELECT storage_path, COUNT(*) as count
FROM booking_images
WHERE booking_id = 'b5e72fd0-e51c-4689-a1dd-e82ac712fc51'
GROUP BY storage_path
HAVING COUNT(*) > 1;

-- Count total records
SELECT COUNT(*) FROM booking_images
WHERE booking_id = 'b5e72fd0-e51c-4689-a1dd-e82ac712fc51';

-- View all records
SELECT id, storage_path, type, uploaded_at
FROM booking_images
WHERE booking_id = 'b5e72fd0-e51c-4689-a1dd-e82ac712fc51'
ORDER BY uploaded_at DESC;
```

### Supabase Dashboard

```
https://supabase.com/dashboard/project/iqxdatlqgvdcvyfdxywf/editor
```

---

## ✅ REPORTING RESULTS

After testing, reply with:

```
TEST RESULT: PASS / FAIL

Photos uploaded: [number]
Database records: [number]
Duplicates found: [number]
Console errors: YES / NO
Network issues: YES / NO

Additional notes:
[Any observations]
```

---

**That's it! This covers the most critical functionality in ~10-15 minutes.**

For comprehensive testing of all scenarios, see `MANUAL_TEST_PLAN_IMAGE_UPLOAD.md`.
