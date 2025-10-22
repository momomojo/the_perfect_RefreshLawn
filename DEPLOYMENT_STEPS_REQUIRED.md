# 🚀 Deployment Steps Required

## ✅ Completed Automatically

The following have been applied to the production database:

1. ✅ **Migration**: `20251021000000_fix_hardcoded_credentials_security_issue`
   - ⚠️ **SUPERSEDED** by migration `20251021020000_use_vault_for_credentials`
   - Old approach used database settings (doesn't work on managed Supabase)

2. ✅ **Migration**: `20251021010000_create_rate_limiting_table`
   - Created `rate_limits` table with indexes
   - Added `cleanup_old_rate_limits()` function
   - Enabled RLS (service role only access)

3. ✅ **Migration**: `20251021020000_use_vault_for_credentials`
   - Created `util.project_url()` and `util.service_role_key()` functions
   - Updated trigger function to use Supabase Vault
   - **Requires manual Vault setup** (see below)

## ⚠️ Manual Steps Required

### 1. Rotate Exposed Service Role Key (CRITICAL - DO FIRST)

⚠️ **SECURITY ALERT**: The service role key was previously exposed in documentation and must be rotated immediately.

**Steps**:

1. Go to: Supabase Dashboard → Project Settings → API
2. Find "Service Role" section
3. Click "Rotate" or "Generate new key"
4. **Save the new key** (you'll need it for Step 2)

### 2. Configure Supabase Vault (REQUIRED)

After rotating the key, store credentials in Vault:

```sql
-- Run in: Supabase Dashboard → SQL Editor

-- Store project URL in Vault
select vault.create_secret(
  'https://iqxdatlqgvdcvyfdxywf.supabase.co',
  'project_url'
);

-- Store NEW (rotated) service role key in Vault
-- ⚠️ Use your NEW key from Step 1, NOT the old exposed key!
select vault.create_secret(
  'YOUR_NEW_ROTATED_SERVICE_ROLE_KEY',
  'service_role_key'
);
```

**Why Vault?**:

- ✅ Encrypted at rest
- ✅ Not stored in migrations or version control
- ✅ Easy key rotation without code deployment
- ✅ Official Supabase best practice

**Detailed Instructions**: See `VAULT_SETUP_GUIDE.md`

---

### 3. Verify Vault Configuration

After storing secrets, verify they work:

```sql
-- Test utility functions
select util.project_url();
-- Expected: https://iqxdatlqgvdcvyfdxywf.supabase.co

select substring(util.service_role_key(), 1, 10);
-- Expected: First 10 characters of your key (eyJhbGciOi...)

-- Test trigger function
update bookings
set report_email_sent = true
where id = (
  select id from bookings
  where workflow_status = 'completed'
    and report_email_sent = false
  limit 1
);

-- Check logs for: "Job report email queued for booking..."
```

---

## 📋 Edge Function Deployment Status

### Current Deployment (as of 2025-01-21)

| Function                  | verify_jwt | Status | Needs Redeploy                 |
| ------------------------- | ---------- | ------ | ------------------------------ |
| `stripe-webhook`          | false      | ACTIVE | ⏳ **YES** - Add rate limiting |
| `stripe-payment-api`      | true       | ACTIVE | ⏳ **YES** - Add rate limiting |
| `stripe-customer-api`     | false      | ACTIVE | 🔄 Optional - Update imports   |
| `stripe-api`              | false      | ACTIVE | 🔄 Optional - Update imports   |
| `stripe-admin-api`        | true       | ACTIVE | 🔄 Optional - Update imports   |
| `stripe-refund`           | true       | ACTIVE | 🔄 Optional - Update imports   |
| `stripe-subscription-api` | true       | ACTIVE | 🔄 Optional - Update imports   |
| `send-job-report-email`   | true       | ACTIVE | ✅ No changes needed           |
| `send-push-notification`  | true       | ACTIVE | 🔄 Optional - Update imports   |

### JWT Verification Pattern

**verify_jwt=false**: Public endpoints receiving external requests (webhooks, public APIs)

- Stripe verifies webhook signatures instead of JWT
- Public customer operations

**verify_jwt=true**: Authenticated endpoints requiring user JWT tokens

- User-specific operations (payments, refunds, subscriptions)
- Admin operations
- Internal system operations

---

## 🎯 Priority Redeployments

### P0 - Critical (Do First)

#### 1. stripe-webhook - Add Rate Limiting

**Current**: No rate limiting (vulnerable to webhook flooding)
**Need**: Add `RATE_LIMIT_PROFILES.STRIPE_WEBHOOK` (100 req/15min per IP)

**Deploy command**:

```bash
supabase functions deploy stripe-webhook --project-ref iqxdatlqgvdcvyfdxywf --no-verify-jwt
```

**Why `--no-verify-jwt`**: Stripe webhooks don't include JWT tokens. They use webhook signature verification instead.

#### 2. stripe-payment-api - Add Rate Limiting

**Current**: No rate limiting (vulnerable to payment spam/card testing)
**Need**: Add `RATE_LIMIT_PROFILES.PAYMENT_API` (50 req/15min per user)

**Deploy command**:

```bash
supabase functions deploy stripe-payment-api --project-ref iqxdatlqgvdcvyfdxywf
```

**Default JWT verification**: This function uses JWT by default (verify_jwt=true).

---

### P1 - High (Do Soon)

Update remaining functions to use canonical shared utilities:

```bash
# Migrate to shared utilities, then deploy
supabase functions deploy stripe-customer-api --project-ref iqxdatlqgvdcvyfdxywf --no-verify-jwt
supabase functions deploy stripe-api --project-ref iqxdatlqgvdcvyfdxywf --no-verify-jwt
supabase functions deploy stripe-admin-api --project-ref iqxdatlqgvdcvyfdxywf
supabase functions deploy stripe-refund --project-ref iqxdatlqgvdcvyfdxywf
supabase functions deploy stripe-subscription-api --project-ref iqxdatlqgvdcvyfdxywf
supabase functions deploy send-push-notification --project-ref iqxdatlqgvdcvyfdxywf
```

---

## 🔍 Verification Steps

After deployment, verify:

### 1. Vault Secrets Are Accessible

```sql
-- List secrets (names only, not values)
select id, name, created_at
from vault.secrets
order by created_at desc;

-- Test utility functions
select util.project_url();
select substring(util.service_role_key(), 1, 10);
```

### 2. Trigger Function Works

```sql
-- Update a booking to trigger email send
update bookings
set report_email_sent = true
where id = 'SOME_BOOKING_ID';

-- Check database logs for success message
-- Expected: "[trigger_send_job_report_email] Job report email queued..."
```

### 3. Rate Limiting Works

```bash
# Test stripe-webhook rate limit (should block after 100 requests)
for i in {1..105}; do
  curl -X POST https://iqxdatlqgvdcvyfdxywf.supabase.co/functions/v1/stripe-webhook \
    -H "Content-Type: application/json" \
    -d '{"test": true}' \
    -w "\nStatus: %{http_code}\n"
done

# Expected: First 100 return 200, last 5 return 429 (Rate Limited)
```

### 4. Rate Limit Table Has Data

```sql
-- After some API calls, check rate limit tracking
select
  split_part(key, ':', 1) as limit_type,
  count(*) as request_count
from public.rate_limits
where created_at > now() - interval '15 minutes'
group by split_part(key, ':', 1);
```

### 5. Edge Functions Respond with Rate Limit Headers

```bash
# Check headers on successful request
curl -I https://iqxdatlqgvdcvyfdxywf.supabase.co/functions/v1/stripe-payment-api \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected headers:
# X-RateLimit-Limit: 50
# X-RateLimit-Remaining: 49
# X-RateLimit-Reset: 2025-01-21T...
```

---

## 📚 Documentation References

- **Vault Setup**: `VAULT_SETUP_GUIDE.md` ⭐ **START HERE**
- **Rate Limiting**: `RATE_LIMITING_IMPLEMENTED.md`
- **Security Headers**: `SECURITY_HEADERS_IMPLEMENTED.md`
- **Edge Function Migration**: `EDGE_FUNCTION_MIGRATION_GUIDE.md`
- **Input Validation**: `INPUT_VALIDATION_IMPLEMENTED.md`

---

## ⚠️ Important Notes

### Security Best Practices

1. ✅ **Service role key in Vault** - Not in code, migrations, or database settings
2. ✅ **Rate limiting prevents abuse** - Must be integrated into critical functions
3. ✅ **Security headers** - Automatically included via shared utilities
4. ✅ **Vault is environment-specific** - Configure separately for dev/staging/prod
5. ⚠️ **Rotate exposed keys immediately** - The old key must be rotated before production use

### Deployment Order

1. **First**: Rotate exposed service role key (Supabase Dashboard)
2. **Second**: Configure Vault secrets (SQL Editor)
3. **Third**: Verify trigger function works with Vault
4. **Fourth**: Deploy critical functions with rate limiting (stripe-webhook, stripe-payment-api)
5. **Fifth**: Deploy remaining functions with updated shared utilities

### Rollback Plan

If issues occur:

- **Rate limiting**: Disable by not calling `withRateLimit()` or `checkRateLimit()`
- **Vault**: Trigger will log warnings but won't break (graceful degradation)
- **Edge Functions**: Redeploy previous version with `--no-verify-jwt` flag as needed

---

## 🔐 Security Alert Summary

**What Happened**:

- Service role key was previously exposed in documentation files
- Incorrect SQL instructions were provided (ALTER DATABASE SET doesn't work on managed Supabase)

**What We Fixed**:

- ✅ Created proper Vault-based migration
- ✅ Removed all exposed keys from documentation
- ✅ Updated trigger function to use Vault
- ✅ Created comprehensive Vault setup guide

**What You Must Do**:

1. ⚠️ **Rotate service role key immediately** (Supabase Dashboard → Settings → API)
2. Store new key in Vault using instructions above
3. Verify trigger function works
4. Never commit service role key to version control

---

**Status**: Ready for production deployment (after key rotation and Vault setup)
**Created**: 2025-01-21
**Updated**: 2025-01-21 (Fixed security issue)
**Next Action**: Rotate service role key and configure Vault secrets
