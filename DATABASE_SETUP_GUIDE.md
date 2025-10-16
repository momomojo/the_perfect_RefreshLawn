# Complete Database Setup Guide

## Problem Discovered
Your backup restore failed - only the `profiles` and `services` tables were created. All other tables (bookings, notifications, reviews, payment_methods, customers, payments, subscriptions, invoices, booking_images) were missing.

## Solution: Manual Database Rebuild

Follow these steps **in order** to rebuild your database completely.

---

## Step 1: Run Base Schema Script

**File:** `DATABASE_REBUILD_SCRIPT.sql`

**Action:**
1. Go to: https://supabase.com/dashboard/project/iqxdatlqgvdcvyfdxywf/sql/new
2. Copy and paste the entire contents of `DATABASE_REBUILD_SCRIPT.sql`
3. Click **Run** (bottom right)
4. Wait for "Database rebuild script completed successfully!" message

**What this does:**
- Creates all missing tables (bookings, notifications, reviews, etc.)
- Creates Stripe tables (customers, payments, subscriptions, invoices)
- Sets up database functions and triggers
- Creates performance indexes
- Inserts sample services and recurring plans

**Expected time:** ~30-60 seconds

---

## Step 2: Apply RLS Security Policies

**File:** `DATABASE_RLS_POLICIES.sql`

**Action:**
1. Go to: https://supabase.com/dashboard/project/iqxdatlqgvdcvyfdxywf/sql/new
2. Copy and paste the entire contents of `DATABASE_RLS_POLICIES.sql`
3. Click **Run**
4. Wait for "RLS policies applied successfully!" message

**What this does:**
- Enables Row Level Security (RLS) on all tables
- Creates security policies so users can only access their own data
- Sets up admin policies for full database access
- Configures technician-specific access rules

**Expected time:** ~20-30 seconds

---

## Step 3: Set Up JWT Custom Claims

**File:** `DATABASE_JWT_CUSTOM_CLAIMS.sql`

**Action:**
1. Go to: https://supabase.com/dashboard/project/iqxdatlqgvdcvyfdxywf/sql/new
2. Copy and paste the entire contents of `DATABASE_JWT_CUSTOM_CLAIMS.sql`
3. Click **Run**
4. See message: "JWT Custom Claims function created! NOW GO ENABLE THE HOOK IN DASHBOARD!"

**What this does:**
- Creates the `custom_access_token_hook` function that adds user roles to JWT tokens

**Expected time:** ~5 seconds

---

## Step 4: Enable JWT Hook (MANUAL)

⚠️ **CRITICAL: This step must be done manually in the Dashboard**

**Action:**
1. Go to: https://supabase.com/dashboard/project/iqxdatlqgvdcvyfdxywf/auth/hooks
2. Click "Add Hook" or "Enable Hook"
3. Select these options:
   - **Event Type:** "Custom Access Token" (or "JWT Access Token")
   - **Hook Type:** "Postgres Function" (or "Database Function")
   - **Postgres Function:** Select `public.custom_access_token_hook` from dropdown
4. Click **Save** or **Create**

**What this does:**
- Enables automatic role injection into JWT tokens
- Required for role-based access control (RBAC) to work
- Without this, users won't be able to access admin/technician features

**Expected time:** ~1 minute

---

## Step 5: Create User Accounts

After the database is fully set up, create your user accounts:

### Option A: Via Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/iqxdatlqgvdcvyfdxywf/auth/users
2. Click "Add User" → "Create New User"
3. Fill in:
   - Email: `admin@admin.com`
   - Password: `a1b2c3d4`
   - Auto-confirm user: ✅ Checked
4. After user is created, click on the user to edit
5. Under "User Metadata" (raw_user_meta_data), add:
   ```json
   {
     "role": "admin"
   }
   ```
6. Save

Repeat for other users:
- `claireherman135@gmail.com` - role: "customer"
- `mohibhafeez@gmail.com` - role: "technician"

### Option B: Via SQL (if Dashboard method doesn't work)

Run this SQL in SQL Editor:

```sql
-- Create admin user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  raw_app_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@admin.com',
  crypt('a1b2c3d4', gen_salt('bf')),
  NOW(),
  '{"role": "admin"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Profiles will be auto-created by trigger
```

---

## Step 6: Verify Database Setup

Run this verification query in SQL Editor:

```sql
-- Check all tables exist
SELECT
  'profiles' as table_name, COUNT(*) as count FROM public.profiles
UNION ALL
SELECT 'services', COUNT(*) FROM public.services
UNION ALL
SELECT 'bookings', COUNT(*) FROM public.bookings
UNION ALL
SELECT 'notifications', COUNT(*) FROM public.notifications
UNION ALL
SELECT 'reviews', COUNT(*) FROM public.reviews
UNION ALL
SELECT 'payment_methods', COUNT(*) FROM public.payment_methods
UNION ALL
SELECT 'booking_images', COUNT(*) FROM public.booking_images
UNION ALL
SELECT 'customers', COUNT(*) FROM public.customers
UNION ALL
SELECT 'payments', COUNT(*) FROM public.payments
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM public.subscriptions
UNION ALL
SELECT 'invoices', COUNT(*) FROM public.invoices;
```

**Expected output:**
- All 11 tables should appear
- Services should have ~3 rows (sample data)
- Profiles should have as many rows as users you created
- Other tables may be empty (that's fine)

---

## Step 7: Test Login

1. Go to your app: http://localhost:8090
2. Try logging in with:
   - Email: `admin@admin.com`
   - Password: `a1b2c3d4`
3. You should be redirected to the admin dashboard
4. Test customer and technician logins too

---

## Troubleshooting

### "Relation does not exist" errors
- Make sure you ran Step 1 (DATABASE_REBUILD_SCRIPT.sql) completely
- Check for any error messages in the SQL Editor

### "Row level security policy violation" errors
- Make sure you ran Step 2 (DATABASE_RLS_POLICIES.sql)
- Verify JWT hook is enabled (Step 4)

### Users can't access admin/technician features
- JWT hook is not enabled - complete Step 4
- User metadata doesn't have correct role - check auth.users raw_user_meta_data

### Login not working
- Users may not exist in auth.users table - complete Step 5
- Password may be incorrect - reset via Dashboard

---

## Summary

After completing all steps:
- ✅ All 11 tables created with proper schema
- ✅ RLS policies protect user data
- ✅ JWT hooks inject roles into authentication tokens
- ✅ Users can be created and assigned roles
- ✅ App should work with full role-based access control

**Next:** Test all user workflows (booking creation, payment processing, technician assignment, etc.)
