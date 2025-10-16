# Stripe Edge Function 400 Error - Investigation & Fix Summary

## Issue Identified

**Root Cause**: The `stripe-customer-api` Edge Function is returning HTTP 400 errors because the `STRIPE_SECRET_KEY` environment variable is **NOT configured** in the remote Supabase Edge Function environment.

### Technical Details

1. **Missing Environment Variable**: Edge Functions on Supabase require secrets to be explicitly configured via the Supabase CLI or Dashboard
2. **Client `.env` File Limitation**: The `.env` file in your project root only contains variables prefixed with `EXPO_PUBLIC_` which are for client-side code only
3. **Server-Side Configuration Required**: Edge Functions need server-side secrets set through Supabase's secret management system

## What Was Done

### 1. Enhanced Error Logging

Updated `D:\projects main\the_perfect_RefreshLawn\supabase\functions\shared\stripe-utils.ts`:
- Added environment variable validation on initialization
- Logs critical errors when STRIPE_SECRET_KEY is missing
- Lists available environment variables for debugging

Updated `D:\projects main\the_perfect_RefreshLawn\supabase\functions\stripe-customer-api\index.ts`:
- Added early validation of STRIPE_SECRET_KEY before processing requests
- Enhanced request body parsing with detailed logging
- Better error messages for missing or invalid requests

### 2. Deployed Updated Edge Function

```bash
supabase functions deploy stripe-customer-api --project-ref iqxdatlqgvdcvyfdxywf
```

**Status**: Successfully deployed (version 2)

### 3. Created Configuration Tools

**Files Created**:
1. `supabase/functions/.env.example` - Template for local Edge Function development
2. `STRIPE_EDGE_FUNCTION_FIX.md` - Comprehensive fix instructions
3. `setup-stripe-secret.ps1` - PowerShell script to automate secret configuration

## How to Fix (ACTION REQUIRED)

### Option 1: Using PowerShell Script (Easiest)

```powershell
cd "D:\projects main\the_perfect_RefreshLawn"
.\setup-stripe-secret.ps1
```

The script will:
1. Prompt you for your Stripe secret key
2. Validate the key format
3. Configure it in Supabase automatically
4. Verify the configuration

### Option 2: Manual Configuration

#### Step A: Get Your Stripe Secret Key

1. Open: https://dashboard.stripe.com/test/apikeys
2. Click "Reveal test key" in the "Secret key" section
3. Copy the key (starts with `sk_test_`)

#### Step B: Configure in Supabase

```bash
# Navigate to project directory
cd "D:\projects main\the_perfect_RefreshLawn"

# Set the secret (replace YOUR_KEY_HERE with actual key)
supabase secrets set --project-ref iqxdatlqgvdcvyfdxywf STRIPE_SECRET_KEY="sk_test_YOUR_KEY_HERE"

# Verify it was set
supabase secrets list --project-ref iqxdatlqgvdcvyfdxywf
```

### Option 3: Using Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/iqxdatlqgvdcvyfdxywf/settings/functions
2. Scroll to "Secrets" section
3. Click "Add secret"
4. Name: `STRIPE_SECRET_KEY`
5. Value: `sk_test_YOUR_ACTUAL_KEY_HERE`
6. Click "Save"

## Testing the Fix

### 1. Test in Your Application

1. Open: http://localhost:8082/
2. Log in as customer: claireherman135@gmail.com (password: a1b2c3d4)
3. Start a new booking for "Basic Lawn Mowing"
4. Proceed through all steps until you reach the payment method page
5. **Expected Result**: Page loads successfully showing "Cash on Delivery" and "Add New Credit/Debit Card" options

### 2. Check Logs for Confirmation

```bash
# View real-time logs to confirm success
supabase functions logs stripe-customer-api --project-ref iqxdatlqgvdcvyfdxywf
```

**Success Indicators**:
- HTTP 200 status codes instead of 400
- Log messages showing "stripe-customer-api called: path=list-payment-methods"
- No "FATAL: STRIPE_SECRET_KEY environment variable is not set" errors

## Additional Edge Functions Requiring Configuration

Once the `STRIPE_SECRET_KEY` is set, these other Edge Functions will also work:

- `stripe-payment-api` - Creates payment intents for processing payments
- `stripe-webhook` - Handles Stripe webhook events
- `stripe-admin-api` - Admin operations (refunds, etc.)
- `stripe-subscription-api` - Subscription management
- `stripe-refund` - Refund processing

No additional deployment needed - they all share the same secret configuration.

## Expected Timeline

1. **Configure Secret** (2 minutes)
   - Get Stripe key from dashboard
   - Run setup script or manual command

2. **Test Fix** (3 minutes)
   - Navigate to payment page in app
   - Verify payment methods load
   - Try adding a test card

3. **Complete QA** (10 minutes)
   - Complete end-to-end booking flow
   - Test payment processing with test card
   - Verify booking appears in database

**Total**: ~15 minutes to resolution

## Technical Architecture Notes

### Why This Happened

1. **Environment Variable Scope**: Expo's `.env` file only handles client-side variables (`EXPO_PUBLIC_*`)
2. **Edge Function Isolation**: Supabase Edge Functions run in a separate Deno environment
3. **Security by Design**: Server secrets must be explicitly configured, not read from files

### Proper Configuration Pattern

```
Client-Side (.env file):
  EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  ✓

Server-Side (Supabase Secrets):
  STRIPE_SECRET_KEY=sk_test_...  ✓ (via supabase secrets set)
```

## Error Messages Explained

### Before Fix
```
POST | 400 | https://iqxdatlqgvdcvyfdxywf.supabase.co/functions/v1/stripe-customer-api
Edge Function returned a non-2xx status code
```

### After Fix (Expected)
```
POST | 200 | https://iqxdatlqgvdcvyfdxywf.supabase.co/functions/v1/stripe-customer-api
stripe-customer-api called: path=list-payment-methods, user=68ef7057...
```

## Security Considerations

1. ✓ Never commit `.env` files with secrets to version control
2. ✓ Use test keys (`sk_test_*`) during development
3. ✓ Rotate keys if you suspect they've been compromised
4. ✓ Use live keys (`sk_live_*`) only in production
5. ✓ Edge Function secrets are encrypted at rest

## Next Steps After Resolution

Once payment methods load correctly:

1. **Complete Booking Flow Testing**
   - Test adding new payment method
   - Test completing booking with card payment
   - Test cash payment option
   - Verify booking appears in database
   - Check Stripe dashboard for payment intent

2. **Production Readiness**
   - Switch to live Stripe keys when ready for production
   - Test webhook delivery in production
   - Set up monitoring and alerts
   - Document payment flow for team

3. **Documentation Updates**
   - Update `.env.template` with all required variables
   - Document Edge Function secret configuration in README
   - Create runbook for future developers

## Support Resources

- **Stripe Dashboard**: https://dashboard.stripe.com/test/apikeys
- **Supabase Dashboard**: https://supabase.com/dashboard/project/iqxdatlqgvdcvyfdxywf
- **Edge Function Logs**: `supabase functions logs stripe-customer-api --project-ref iqxdatlqgvdcvyfdxywf`
- **Detailed Instructions**: `STRIPE_EDGE_FUNCTION_FIX.md`
- **Stripe Documentation**: https://docs.stripe.com/keys

## Files Modified/Created

### Modified
- `D:\projects main\the_perfect_RefreshLawn\supabase\functions\shared\stripe-utils.ts`
- `D:\projects main\the_perfect_RefreshLawn\supabase\functions\stripe-customer-api\index.ts`

### Created
- `D:\projects main\the_perfect_RefreshLawn\supabase\functions\.env.example`
- `D:\projects main\the_perfect_RefreshLawn\STRIPE_EDGE_FUNCTION_FIX.md`
- `D:\projects main\the_perfect_RefreshLawn\setup-stripe-secret.ps1`
- `D:\projects main\the_perfect_RefreshLawn\STRIPE_FIX_SUMMARY.md` (this file)

## Current Status

✓ Edge Function enhanced with detailed error logging
✓ Edge Function deployed to remote Supabase (version 2)
✓ Configuration tools and documentation created
⏳ **AWAITING**: Stripe secret key configuration by user
⏳ **PENDING**: Testing and verification

---

**Ready to proceed?** Run the setup script or follow the manual configuration steps above!
