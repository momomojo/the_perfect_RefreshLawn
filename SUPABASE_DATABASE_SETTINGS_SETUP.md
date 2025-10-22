# ⚠️ DEPRECATED: Database Settings Approach

## This Document is Deprecated

**Date**: 2025-01-21
**Status**: ❌ **DEPRECATED** - Do not use these instructions!

---

## 🚨 Why This Approach is Wrong

The instructions in this document used `ALTER DATABASE SET` to store credentials, which:

1. ❌ **Doesn't work on managed Supabase** - Requires superuser privileges
2. ❌ **Fails with permission denied error** - `ERROR: 42501: permission denied to set parameter`
3. ❌ **Exposes secrets** - Service role key was visible in documentation
4. ❌ **Not a Supabase best practice** - Violates official security guidelines

---

## ✅ Use Supabase Vault Instead

The **correct** approach is to use **Supabase Vault** for secure credential storage.

### Why Vault?

- ✅ **Works on managed Supabase** - No special permissions required
- ✅ **Encrypted at rest** - Uses AES-GCM-256 encryption
- ✅ **Official best practice** - Recommended by Supabase documentation
- ✅ **Environment-specific** - Different secrets for dev/staging/prod
- ✅ **Easy key rotation** - No code deployment needed

---

## 📚 See the Correct Guide

👉 **[VAULT_SETUP_GUIDE.md](./VAULT_SETUP_GUIDE.md)** 👈

This guide contains:

- Step-by-step Vault setup instructions
- Service role key rotation guide
- Verification and testing steps
- Troubleshooting help
- Security best practices

---

## 🔐 Security Alert

⚠️ **IMPORTANT**: If you followed the old instructions in this document:

1. **Rotate your service role key immediately** (it was exposed)
2. Go to: Supabase Dashboard → Project Settings → API → Service Role → Rotate
3. Store the new key in Vault using [VAULT_SETUP_GUIDE.md](./VAULT_SETUP_GUIDE.md)
4. Never commit service role keys to version control

---

## Migration History

**Old Migration** (Deprecated):

- `20251021000000_fix_hardcoded_credentials_security_issue.sql`
- Used `current_setting('app.supabase_url')` and `current_setting('app.service_role_key')`
- Doesn't work on managed Supabase

**New Migration** (Correct):

- `20251021020000_use_vault_for_credentials.sql`
- Uses `util.project_url()` and `util.service_role_key()` to retrieve from Vault
- Works on all Supabase environments

---

## References

- **Correct Guide**: `VAULT_SETUP_GUIDE.md`
- **New Migration**: `supabase/migrations/20251021020000_use_vault_for_credentials.sql`
- **Supabase Vault Docs**: https://supabase.com/docs/guides/database/vault
- **Deployment Steps**: `DEPLOYMENT_STEPS_REQUIRED.md`

---

**Status**: ❌ Deprecated - Use Vault instead
**Replacement**: `VAULT_SETUP_GUIDE.md`
**Last Updated**: 2025-01-21
