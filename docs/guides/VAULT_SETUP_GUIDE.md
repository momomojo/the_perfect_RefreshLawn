# Supabase Vault Setup Guide

## 🔒 Secure Credential Storage with Supabase Vault

This guide explains how to properly configure secure credentials using **Supabase Vault** for the RefreshLawn application.

## 🚨 CRITICAL: First-Time Setup

If you're setting this up for the first time after the security fix, you **MUST**:

1. ⚠️ **Rotate your service role key immediately** (the old key was exposed)
2. Store the new key in Vault (never in code or migrations)
3. Verify the trigger function works with Vault

---

## 📋 What is Supabase Vault?

Supabase Vault is a secure secrets management system built into Supabase Postgres:

- ✅ Secrets are **encrypted at rest** using AES-GCM-256
- ✅ Secrets are **never exposed** in migrations or code
- ✅ Secrets are **environment-specific** (different for dev/staging/prod)
- ✅ **Easy rotation** without code deployment
- ✅ **Official Supabase pattern** for storing sensitive credentials

**Reference**: https://supabase.com/docs/guides/database/vault

---

## 🛠️ Step 1: Rotate Service Role Key (REQUIRED)

The service role key needs to be rotated if it was previously exposed:

1. Go to: **Supabase Dashboard** → **Project Settings** → **API**
2. Find the **Service Role** section
3. Click **"Reveal"** to see the current key
4. Click **"Rotate"** or **"Generate new key"**
5. **Save the new key** (you'll need it in Step 2)

⚠️ **Important**: Once rotated, the old key becomes invalid immediately.

---

## 🗄️ Step 2: Store Secrets in Vault

After rotating the key, store both the project URL and new service role key in Vault.

### Via Supabase SQL Editor (Recommended)

1. Go to: **Supabase Dashboard** → **SQL Editor**
2. Run these commands (replace with your actual values):

```sql
-- Store project URL in Vault
select vault.create_secret(
  'https://YOUR_PROJECT_REF.supabase.co',
  'project_url'
);

-- Store NEW (rotated) service role key in Vault
select vault.create_secret(
  'YOUR_NEW_SERVICE_ROLE_KEY',
  'service_role_key'
);
```

**Example** (with placeholder values):

```sql
-- DO NOT use these example values - use your actual credentials!
select vault.create_secret('https://iqxdatlqgvdcvyfdxywf.supabase.co', 'project_url');
select vault.create_secret('eyJhbGciOiJIUzI1NiIsInR5cCI6...', 'service_role_key');
```

3. **Verify secrets were stored**:

```sql
-- List all vault secrets (shows names only, not values)
select id, name, created_at
from vault.secrets
order by created_at desc;

-- Expected output:
-- | id | name              | created_at          |
-- |----|-------------------|---------------------|
-- | 1  | project_url       | 2025-01-21 10:00:00 |
-- | 2  | service_role_key  | 2025-01-21 10:00:05 |
```

---

## ✅ Step 3: Verify Utility Functions

The migration created two utility functions that retrieve secrets from Vault:

```sql
-- Test retrieving project URL
select util.project_url();
-- Expected: https://YOUR_PROJECT_REF.supabase.co

-- Test retrieving service role key (only first 10 chars for safety)
select substring(util.service_role_key(), 1, 10);
-- Expected: eyJhbGciOi... (first 10 characters)
```

If either function returns `NULL`, the secret is not configured in Vault.

---

## 🧪 Step 4: Test Trigger Function

Verify the trigger function can access Vault secrets and send emails:

```sql
-- Find a completed booking to test with
select id, workflow_status, report_email_sent
from bookings
where workflow_status = 'completed'
  and report_email_sent = false
limit 1;

-- Trigger the email send by updating report_email_sent flag
-- (Use the booking ID from the query above)
update bookings
set report_email_sent = true
where id = 'BOOKING_ID_FROM_ABOVE';

-- Check database logs for trigger execution
-- Look for: "[trigger_send_job_report_email] Job report email queued for booking..."
```

**Successful output** (in database logs):

```
NOTICE: [trigger_send_job_report_email] Job report email queued for booking abc123... (request_id: 456)
```

**Failed output** (configuration missing):

```
WARNING: [trigger_send_job_report_email] Failed to retrieve project_url from Vault: ...
WARNING: [trigger_send_job_report_email] Email will not be sent for booking abc123... Please configure Vault secrets.
```

---

## 🌍 Environment-Specific Configuration

### Local Development

If you're using local Supabase:

```sql
-- Local project URL (default port: 54321)
select vault.create_secret('http://localhost:54321', 'project_url');

-- Local service role key (from supabase status output)
select vault.create_secret('YOUR_LOCAL_SERVICE_ROLE_KEY', 'service_role_key');
```

### Staging Environment

```sql
select vault.create_secret('https://staging-project-ref.supabase.co', 'project_url');
select vault.create_secret('STAGING_SERVICE_ROLE_KEY', 'service_role_key');
```

### Production Environment

```sql
select vault.create_secret('https://production-project-ref.supabase.co', 'project_url');
select vault.create_secret('PRODUCTION_SERVICE_ROLE_KEY', 'service_role_key');
```

---

## 🔄 Rotating Service Role Key

To rotate the service role key:

1. **Generate new key** in Supabase Dashboard (Settings → API → Rotate)
2. **Update Vault secret**:

```sql
-- Update service_role_key in Vault
select vault.update_secret(
  (select id from vault.secrets where name = 'service_role_key'),
  'NEW_SERVICE_ROLE_KEY'
);

-- Or delete and recreate:
delete from vault.secrets where name = 'service_role_key';
select vault.create_secret('NEW_SERVICE_ROLE_KEY', 'service_role_key');
```

3. **Test immediately**:

```sql
-- Verify new key is retrieved
select substring(util.service_role_key(), 1, 10);

-- Test trigger function still works
update bookings set report_email_sent = true where id = 'TEST_BOOKING_ID';
```

✅ **No code deployment needed** - change takes effect immediately!

---

## ⚠️ Troubleshooting

### Error: "Failed to retrieve project_url from Vault"

**Cause**: Secret not configured in Vault

**Fix**:

```sql
-- Check if secret exists
select name from vault.secrets where name = 'project_url';

-- If empty, create it
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
```

### Error: "Failed to retrieve service_role_key from Vault"

**Cause**: Secret not configured in Vault

**Fix**:

```sql
-- Check if secret exists
select name from vault.secrets where name = 'service_role_key';

-- If empty, create it (use your rotated key!)
select vault.create_secret('YOUR_NEW_SERVICE_ROLE_KEY', 'service_role_key');
```

### Utility function returns NULL

**Cause**: Secret exists but function can't decrypt it (permission issue)

**Fix**:

```sql
-- Check secret exists
select id, name from vault.secrets where name = 'project_url';

-- Grant permissions on vault schema (if needed)
grant usage on schema vault to postgres;
grant select on vault.decrypted_secrets to postgres;
```

### Trigger still not working after Vault setup

**Debug steps**:

```sql
-- 1. Verify secrets are accessible
select util.project_url();
select substring(util.service_role_key(), 1, 10);

-- 2. Check trigger is attached to bookings table
select tgname, tgenabled
from pg_trigger
where tgrelid = 'bookings'::regclass
  and tgname = 'trigger_send_job_report_email_trigger';

-- 3. Check pg_net extension is enabled
select * from pg_extension where extname = 'pg_net';

-- If pg_net is missing:
create extension if not exists pg_net;
```

---

## 🔍 Finding Your Service Role Key

### Via Supabase Dashboard

1. Go to: **Project Settings** → **API**
2. Find section: **Project API keys**
3. Copy the **service_role** key (click "Reveal" if hidden)
4. ⚠️ **Security**: This key bypasses Row Level Security - handle with extreme care!

### Via Supabase CLI

```bash
supabase projects api-keys --project-ref YOUR_PROJECT_REF
```

---

## 📚 Related Files

- **Migration**: `supabase/migrations/20251021020000_use_vault_for_credentials.sql`
- **Utility Functions**: `util.project_url()`, `util.service_role_key()`
- **Trigger Function**: `public.trigger_send_job_report_email()`
- **Edge Function**: `supabase/functions/send-job-report-email/index.ts`

---

## 🔐 Security Best Practices

1. ✅ **Always rotate after exposure** - If a key was ever committed or exposed, rotate immediately
2. ✅ **Use different keys per environment** - Never share credentials between dev/staging/prod
3. ✅ **Monitor Vault access** - Check Supabase logs for unusual secret access patterns
4. ✅ **Rotate quarterly** - Regular key rotation limits exposure window
5. ✅ **Restrict dashboard access** - Only trusted admins should access Project Settings → API
6. ✅ **Never commit secrets** - Vault secrets are environment-specific, never in version control
7. ✅ **Test after changes** - Always verify trigger works after rotating keys

---

## 🎯 Quick Reference

```sql
-- Store secrets
select vault.create_secret('VALUE', 'SECRET_NAME');

-- Retrieve secret (via utility function)
select util.project_url();
select util.service_role_key();

-- List all secrets (names only)
select id, name, created_at from vault.secrets;

-- Update existing secret
select vault.update_secret(
  (select id from vault.secrets where name = 'SECRET_NAME'),
  'NEW_VALUE'
);

-- Delete secret
delete from vault.secrets where name = 'SECRET_NAME';

-- Test trigger
update bookings set report_email_sent = true where id = 'BOOKING_ID';
```

---

**Created**: 2025-01-21
**Migration**: 20251021020000
**Status**: ✅ Production ready after Vault setup
**Security**: Uses Supabase Vault (official pattern)
