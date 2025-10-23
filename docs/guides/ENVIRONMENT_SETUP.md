# Environment Variable Setup Guide

## Overview

LawnRefresh requires specific environment variables to function correctly. Missing or incorrect variables will cause runtime failures. This guide explains how to set up both **client-side** (app) and **server-side** (Supabase Edge Functions) environment variables.

---

## 🎯 Quick Start Checklist

- [ ] Create `.env` file in project root
- [ ] Add all `EXPO_PUBLIC_*` variables to `.env`
- [ ] Run `npm run validate-env` to verify client setup
- [ ] Set Supabase Edge Function secrets
- [ ] Run `supabase secrets list` to verify server setup

---

## 📱 Client-Side Variables (Mobile/Web App)

### Required Variables

These variables must be set in your `.env` file with the `EXPO_PUBLIC_` prefix. They will be embedded in the client bundle.

| Variable                             | Description                   | Example                        | Where to Find                                     |
| ------------------------------------ | ----------------------------- | ------------------------------ | ------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`           | Your Supabase project URL     | `https://xxx.supabase.co`      | Supabase Dashboard → Settings → API → Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`      | Supabase anonymous/public key | `eyJhbGc...`                   | Supabase Dashboard → Settings → API → anon public |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key        | `pk_test_...` or `pk_live_...` | Stripe Dashboard → Developers → API keys          |

### Optional Variables

| Variable                      | Description                                      | Default             | Example                         |
| ----------------------------- | ------------------------------------------------ | ------------------- | ------------------------------- |
| `EXPO_PUBLIC_APP_NAME`        | Application display name                         | `"LawnRefresh"`     | `"My Lawn Service"`             |
| `EXPO_PUBLIC_GOOGLE_PLACE_ID` | Google Place ID for review redirects (4-5 stars) | Generic search used | `"ChIJN1t_tDeuEmsRUsoyG83frY4"` |

> **Important**: `EXPO_PUBLIC_GOOGLE_PLACE_ID` is **highly recommended** for the customer review system. When customers rate your service 4-5 stars, they'll be redirected to Google Reviews. Without this variable, they'll be sent to a generic Google search instead of your specific business page.
>
> **How to get your Google Place ID**:
>
> 1. Visit: https://developers.google.com/maps/documentation/places/web-service/place-id
> 2. Click "Place ID Finder"
> 3. Search for your business name and location
> 4. Copy the Place ID (format: `ChIJxxxxxxxxxxxxx`)
>
> Alternatively, search for your business on Google Maps, click on it, and extract the Place ID from the URL.

### Setup Instructions

1. **Create `.env` file** in the project root:

```bash
# Create .env file
touch .env
```

2. **Add your variables**:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Stripe Configuration
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Optional
EXPO_PUBLIC_APP_NAME=LawnRefresh

# Google Reviews Integration (Highly Recommended)
# Get your Place ID: https://developers.google.com/maps/documentation/places/web-service/place-id
EXPO_PUBLIC_GOOGLE_PLACE_ID=ChIJyour_google_place_id_here
```

3. **Validate your setup**:

```bash
# Run validation script
npm run validate-env

# Or start the app (validation happens automatically)
npx expo start
```

4. **Expected output**:

```
[EnvValidation] Starting environment validation...
[EnvValidation] ✅ EXPO_PUBLIC_SUPABASE_URL: Present and valid
[EnvValidation] ✅ EXPO_PUBLIC_SUPABASE_ANON_KEY: Present and valid
[EnvValidation] ✅ EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: Present and valid
[EnvValidation] ✅ All environment variables validated successfully
```

---

## 🔧 Server-Side Variables (Supabase Edge Functions)

These variables are **NOT** included in the client bundle. They must be set in your Supabase project using the Supabase CLI.

### Required Server Secrets

| Secret Name                 | Description                                      | Example                        | Where to Find                                             |
| --------------------------- | ------------------------------------------------ | ------------------------------ | --------------------------------------------------------- |
| `SUPABASE_URL`              | Your Supabase project URL                        | `https://xxx.supabase.co`      | Same as client URL                                        |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin access)         | `eyJhbGc...`                   | Supabase Dashboard → Settings → API → service_role        |
| `STRIPE_SECRET_KEY`         | Stripe secret key                                | `sk_test_...` or `sk_live_...` | Stripe Dashboard → Developers → API keys → Secret key     |
| `STRIPE_WEBHOOK_SECRET`     | Stripe webhook signing secret                    | `whsec_...`                    | Stripe Dashboard → Developers → Webhooks → Signing secret |
| `STRIPE_PUBLISHABLE_KEY`    | Stripe publishable key (for returning to client) | `pk_test_...`                  | Same as client publishable key                            |

### Setup Instructions

1. **Install Supabase CLI** (if not already installed):

```bash
npm install -g supabase
```

2. **Login to Supabase**:

```bash
supabase login
```

3. **Link your project**:

```bash
supabase link --project-ref your-project-ref
```

> 💡 Find your project ref in Supabase Dashboard → Settings → General → Reference ID

4. **Set all secrets**:

```bash
# Supabase Configuration
supabase secrets set SUPABASE_URL="https://your-project.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Stripe Configuration
supabase secrets set STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
supabase secrets set STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"
```

5. **Verify secrets are set**:

```bash
supabase secrets list
```

Expected output:

```
┌────────────────────────────────┐
│ Secrets                        │
├────────────────────────────────┤
│ SUPABASE_URL                   │
│ SUPABASE_SERVICE_ROLE_KEY      │
│ STRIPE_SECRET_KEY              │
│ STRIPE_WEBHOOK_SECRET          │
│ STRIPE_PUBLISHABLE_KEY         │
└────────────────────────────────┘
```

6. **Redeploy Edge Functions** (after setting secrets):

```bash
# Deploy all functions
supabase functions deploy

# Or deploy specific function
supabase functions deploy stripe-payment-api
```

---

## 🔐 Security Best Practices

### DO ✅

- Use `EXPO_PUBLIC_` prefix for client-safe variables only
- Use test keys during development (`pk_test_*`, `sk_test_*`)
- Rotate keys immediately if accidentally committed
- Use `.gitignore` to prevent `.env` from being committed
- Store production keys in secure environment variables (EAS Secrets, etc.)

### DON'T ❌

- Never use `EXPO_PUBLIC_` for sensitive keys (service roles, secret keys)
- Never commit `.env` file to version control
- Never expose server secrets in client code
- Never use production keys in development

---

## 🚨 Troubleshooting

### Error: "EXPO_PUBLIC_SUPABASE_URL is not set"

**Cause**: Missing `.env` file or incorrect variable name.

**Solution**:

```bash
# Check if .env exists
ls -la .env

# Verify contents
cat .env

# Ensure variables start with EXPO_PUBLIC_
```

### Error: "Stripe publishable key not found in environment"

**Cause**: Edge function can't find `STRIPE_PUBLISHABLE_KEY` secret.

**Solution**:

```bash
# Check if secret is set
supabase secrets list

# Set the secret
supabase secrets set STRIPE_PUBLISHABLE_KEY="pk_test_your_key"

# Redeploy function
supabase functions deploy stripe-payment-api
```

### Error: "Network request failed" or "401 Unauthorized"

**Cause**: Incorrect Supabase URL or anon key.

**Solution**:

1. Verify keys in Supabase Dashboard → Settings → API
2. Copy exact values (including no extra spaces)
3. Update `.env` file
4. Restart dev server: `npx expo start --clear`

### Variables not updating

**Cause**: Metro bundler cache or environment not reloaded.

**Solution**:

```bash
# Clear Metro cache and restart
npx expo start --clear

# Or manually clear
rm -rf node_modules/.cache
npx expo start
```

---

## 📋 Environment Variable Reference

### .env File Template

Create this file as `.env` in your project root:

```env
# =============================================================================
# LawnRefresh App - Environment Variables
# =============================================================================

# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Stripe Configuration (Publishable Key)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Optional Configuration
EXPO_PUBLIC_APP_NAME=LawnRefresh

# Google Reviews Integration (Highly Recommended for Review System)
# Get your Place ID: https://developers.google.com/maps/documentation/places/web-service/place-id
EXPO_PUBLIC_GOOGLE_PLACE_ID=ChIJyour_google_place_id_here
```

### Supabase Secrets Template

Run these commands to set server secrets:

```bash
supabase secrets set SUPABASE_URL="https://your-project.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
supabase secrets set STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
supabase secrets set STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"
```

---

## 🔗 External Resources

### Finding Your Keys

**Supabase Dashboard:**

- URL: https://app.supabase.com/project/YOUR_PROJECT/settings/api
- Keys: Settings → API → Project API keys

**Stripe Dashboard:**

- Keys: https://dashboard.stripe.com/test/apikeys
- Webhooks: https://dashboard.stripe.com/test/webhooks

### Documentation

- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Stripe API Keys](https://stripe.com/docs/keys)

---

## 💡 Production Deployment

When deploying to production:

1. **Update client variables** in EAS or your build service:

   ```bash
   eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://prod.supabase.co"
   ```

2. **Update server secrets** with production keys:

   ```bash
   supabase secrets set STRIPE_SECRET_KEY="sk_live_your_production_key" --project-ref prod-ref
   ```

3. **Use live Stripe keys** (replace `pk_test_*` and `sk_test_*` with `pk_live_*` and `sk_live_*`)

4. **Verify all secrets** before deploying:
   ```bash
   npm run validate-env
   supabase secrets list --project-ref prod-ref
   ```

---

**Last Updated**: October 9, 2025  
**Version**: 1.0.0
