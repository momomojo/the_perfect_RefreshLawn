# Stripe Edge Function 400 Error - Fix Instructions

## Problem Summary

The `stripe-customer-api` Edge Function is returning 400 errors because the **STRIPE_SECRET_KEY** environment variable is not configured in the remote Supabase environment.

## Root Cause

Edge Functions on Supabase require secrets to be explicitly configured via the Supabase CLI or Dashboard. The `.env` file in your project root only works for local client-side code (variables prefixed with `EXPO_PUBLIC_`), not for server-side Edge Functions.

## Solution: Configure Stripe Secret Key

### Step 1: Get Your Stripe Secret Key

1. Go to the Stripe Dashboard: https://dashboard.stripe.com/test/apikeys
2. Click on "Developers" in the left sidebar
3. Click on "API keys"
4. In the "Secret key" section, click "Reveal test key"
5. Copy the key (it starts with `sk_test_`)

### Step 2: Configure the Secret in Supabase

You have **two options** to set the secret:

#### Option A: Using Supabase CLI (Recommended)

```bash
# Navigate to your project directory
cd "D:\projects main\the_perfect_RefreshLawn"

# Set the Stripe secret key for your remote project
supabase secrets set --project-ref iqxdatlqgvdcvyfdxywf STRIPE_SECRET_KEY="sk_test_YOUR_ACTUAL_KEY_HERE"

# Verify the secret was set
supabase secrets list --project-ref iqxdatlqgvdcvyfdxywf
```

#### Option B: Using Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/iqxdatlqgvdcvyfdxywf/settings/functions
2. Scroll to "Secrets" section
3. Click "Add secret"
4. Name: `STRIPE_SECRET_KEY`
5. Value: `sk_test_YOUR_ACTUAL_KEY_HERE`
6. Click "Save"

### Step 3: Deploy Updated Edge Function

The Edge Function has been updated with better error logging. Deploy it:

```bash
# Deploy the updated stripe-customer-api function
supabase functions deploy stripe-customer-api --project-ref iqxdatlqgvdcvyfdxywf
```

### Step 4: Test the Fix

1. In your app, navigate to the payment method page
2. The page should now load payment methods successfully
3. If still not working, check the logs:

```bash
# View real-time logs
supabase functions logs stripe-customer-api --project-ref iqxdatlqgvdcvyfdxywf
```

## For Local Development

If you want to test Edge Functions locally:

```bash
# Create a .env.local file in supabase/functions/ directory
cd supabase/functions
cp .env.example .env.local

# Edit .env.local and add your Stripe secret key
# Then start Supabase locally
supabase start
```

## Verification Checklist

- [ ] Stripe secret key retrieved from dashboard
- [ ] Secret configured in Supabase (via CLI or Dashboard)
- [ ] Updated Edge Function deployed
- [ ] Payment methods page loads without errors
- [ ] Can add new payment methods
- [ ] Can complete booking flow end-to-end

## Additional Edge Functions to Configure

These other Edge Functions also need the `STRIPE_SECRET_KEY`:

- `stripe-payment-api` - For creating payment intents
- `stripe-webhook` - For handling Stripe webhooks
- `stripe-admin-api` - For admin operations
- `stripe-subscription-api` - For subscription management
- `stripe-refund` - For processing refunds

After configuring the secret, deploy all of them:

```bash
# Deploy all Stripe-related functions at once
supabase functions deploy --project-ref iqxdatlqgvdcvyfdxywf
```

## Troubleshooting

### Error: "Secret key not configured"

- Make sure you ran the `supabase secrets set` command
- Verify with `supabase secrets list`
- The secret might take a minute to propagate

### Error: "Invalid API key"

- Double-check you copied the correct key from Stripe dashboard
- Make sure it starts with `sk_test_` (for test mode)
- No extra spaces or quotes in the key value

### Error: Still getting 400 errors

- Check the logs for detailed error messages
- The new logging will show exactly what's failing
- Run: `supabase functions logs stripe-customer-api --project-ref iqxdatlqgvdcvyfdxywf`

## Security Notes

1. **Never commit** secret keys to version control
2. Use **test keys** (`sk_test_*`) during development
3. Use **live keys** (`sk_live_*`) only in production
4. **Rotate keys** if you suspect they've been compromised
5. The `.env.local` file should be in `.gitignore`

## Next Steps After Fix

Once the payment methods load correctly:

1. Test adding a new credit card
2. Complete a full booking with payment
3. Verify the payment appears in Stripe dashboard
4. Test the complete customer workflow end-to-end
