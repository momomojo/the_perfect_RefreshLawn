# Stripe Edge Function Debugging - Enhanced Logging Deployed

## Status: Version 9 Deployed with Comprehensive Logging

**Date:** October 15, 2025
**Edge Function:** stripe-customer-api
**Project:** iqxdatlqgvdcvyfdxywf
**Current Version:** 9 (just deployed)

---

## What Was Changed

### 1. Enhanced Main Handler Logging (`index.ts`)

The main request handler now includes detailed logging at every step:

```typescript
// Logs at START of every request:
- Request method
- Request URL
- All request headers
- Environment variable status (STRIPE_SECRET_KEY, SUPABASE_URL, etc.)

// Logs during REQUEST PROCESSING:
- Request body parsing status
- Extracted path and payload
- Auth header presence
- User verification result (user ID and email)
- Which handler function is being routed to

// Logs at END of every request:
- Any unhandled errors with full stack trace
- Request completion marker
```

### 2. Enhanced Stripe Utils Logging (`stripe-utils.ts`)

Added initialization logging when the Stripe client is created:

```typescript
// Logs when module is first imported:
- All environment variables status
- Stripe secret key prefix (first 7 chars for verification)
- Stripe client creation success/failure
```

---

## Secrets Configuration Verified

All required secrets are properly configured in Supabase:

```
✓ STRIPE_SECRET_KEY         (configured)
✓ STRIPE_PUBLISHABLE_KEY    (configured)
✓ STRIPE_WEBHOOK_SECRET     (configured)
✓ SUPABASE_URL              (configured)
✓ SUPABASE_ANON_KEY         (configured)
✓ SUPABASE_SERVICE_ROLE_KEY (configured)
```

---

## Next Steps: Test & Diagnose

### Step 1: Test the Payment Flow Again

1. **Login as customer**: claireherman135@gmail.com
2. **Start booking flow**:
   - Select "Basic Lawn Mowing"
   - Choose date: October 16
   - Choose time: 10:00 AM
   - Confirm address
   - Select frequency
3. **Navigate to Payment Method step** (this is where it was failing)
4. **Watch for the behavior**:
   - Does it show "Loading cards..." indefinitely?
   - Does it show an error message?
   - Does it load successfully?

### Step 2: Check the Detailed Logs

Immediately after testing, check the logs in Supabase Dashboard:

**URL:** https://supabase.com/dashboard/project/iqxdatlqgvdcvyfdxywf/functions/stripe-customer-api/logs

**What to look for in the logs:**

1. **Stripe Utils Initialization** (first thing logged):
   ```
   === STRIPE-UTILS INITIALIZATION ===
   Environment variables check:
   - STRIPE_SECRET_KEY: Set (starts with sk_test...)
   - SUPABASE_URL: Set (https://...)
   - SUPABASE_SERVICE_ROLE_KEY: Set
   Creating Stripe client instance...
   Stripe client created successfully
   ```

2. **Request Start** (for each payment method list request):
   ```
   === STRIPE-CUSTOMER-API REQUEST START ===
   Method: POST
   URL: ...
   Headers: {...}
   ```

3. **Environment Check** (confirms secrets are accessible at runtime):
   ```
   Environment check:
   - STRIPE_SECRET_KEY: Set (sk_test...)
   - SUPABASE_URL: Set
   - SUPABASE_SERVICE_ROLE_KEY: Set
   ```

4. **Request Body Parsing**:
   ```
   Parsing request body...
   Request body parsed successfully: {"path":"list-payment-methods"}
   Extracted routePath: list-payment-methods
   ```

5. **User Authentication**:
   ```
   Verifying user authentication...
   Auth header present: true
   User verified successfully: 6e936a33-... (claireherman135@gmail.com)
   Routing to handler: path=list-payment-methods, user=6e936a33-...
   ```

6. **Handler Execution**:
   ```
   Routing to: handleListPaymentMethods
   ```

7. **Any Errors** (if something fails):
   ```
   === UNHANDLED ERROR IN MAIN HANDLER ===
   Error type: [ErrorType]
   Error message: [Actual error message]
   Error stack: [Full stack trace]
   ```

---

## Expected Outcomes

### Scenario A: Environment Variables Not Set at Runtime
**Symptoms:**
- Log shows "STRIPE_SECRET_KEY: NOT SET" in environment check
- Returns 500 error with message "Server configuration error: Stripe API key not configured"

**Diagnosis:** Secrets are configured in database but not being injected into edge function runtime
**Solution:** Need to restart/redeploy edge function OR verify secret injection mechanism

### Scenario B: Request Body Parsing Failure
**Symptoms:**
- Log shows "Failed to parse request body: [error]"
- Returns 400 error with "Invalid request body"

**Diagnosis:** Frontend is sending malformed JSON or unexpected format
**Solution:** Check frontend request format (should be `{path: "list-payment-methods"}`)

### Scenario C: Missing Path Field
**Symptoms:**
- Log shows "Missing 'path' in request body"
- Body contains unexpected structure

**Diagnosis:** Request body structure mismatch between frontend and backend
**Solution:** Verify frontend sends `{path: "...", payload: {...}}` format

### Scenario D: Authentication Failure
**Symptoms:**
- Log shows "Auth header present: false" OR
- Log shows "User verification failed"
- Returns 401 error

**Diagnosis:** JWT token expired, invalid, or not being sent correctly
**Solution:** Check frontend session management and token refresh

### Scenario E: Stripe API Error
**Symptoms:**
- All previous logs succeed
- Error occurs inside `handleListPaymentMethods`
- Error message mentions Stripe-specific issues

**Diagnosis:** Stripe API key invalid, customer not found, or Stripe API issue
**Solution:** Verify Stripe test keys, check customer exists in Stripe dashboard

### Scenario F: Success!
**Symptoms:**
- All logs show successful progression
- Returns 200 with payment methods array
- Frontend displays cards or "No cards" message

**Diagnosis:** Everything is working!
**Solution:** Remove debug logging for production

---

## Additional Diagnostic Tools

### Manual API Test (if needed)

If you want to test the edge function directly (outside the app):

```bash
# Test with curl (replace [YOUR-ACCESS-TOKEN] with actual token)
curl -X POST \
  https://iqxdatlqgvdcvyfdxywf.supabase.co/functions/v1/stripe-customer-api \
  -H "Authorization: Bearer [YOUR-ACCESS-TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"path":"list-payment-methods"}'
```

### Check Stripe Dashboard

Verify the customer exists in Stripe:
1. Go to: https://dashboard.stripe.com/test/customers
2. Search for: claireherman135@gmail.com
3. Check if customer has any payment methods attached

---

## Troubleshooting Tips

### If logs show environment vars are NOT SET:

This means secrets aren't being injected into the runtime. Try:

1. **Redeploy edge function** (forces fresh deployment):
   ```bash
   supabase functions deploy stripe-customer-api --project-ref iqxdatlqgvdcvyfdxywf
   ```

2. **Verify secrets in dashboard**:
   - Go to: https://supabase.com/dashboard/project/iqxdatlqgvdcvyfdxywf/settings/vault/secrets
   - Confirm all secrets are present

3. **Check for typos in secret names**:
   - Must be exactly: `STRIPE_SECRET_KEY` (not `STRIPE_KEY` or `STRIPE_API_KEY`)

### If logs show auth errors:

1. **Check frontend session**:
   - User may need to logout and login again
   - JWT token may have expired

2. **Verify auth header format**:
   - Should be: `Authorization: Bearer <token>`
   - Token should not be expired

### If logs show Stripe API errors:

1. **Verify Stripe test keys**:
   - Secret key should start with `sk_test_`
   - Publishable key should start with `pk_test_`

2. **Check Stripe customer exists**:
   - User may not have been created in Stripe yet
   - May need to call "create-customer" first

---

## Success Criteria

The edge function is working correctly when:

1. ✓ Logs show all environment variables are SET
2. ✓ Logs show request body parsed successfully
3. ✓ Logs show user authenticated successfully
4. ✓ Logs show routing to correct handler
5. ✓ Function returns 200 status code
6. ✓ Frontend displays payment methods (or "No cards" if none exist)
7. ✓ No errors appear in frontend console or Supabase logs

---

## Report Back With:

After testing, please provide:

1. **What you saw in the app**:
   - Error message (if any)
   - Loading state behavior
   - Any console errors in browser

2. **What the logs show**:
   - Screenshot or copy/paste of the most recent edge function logs
   - Specifically the logs from your test request

3. **Edge function version**:
   - Current version should be 9
   - Check in dashboard: https://supabase.com/dashboard/project/iqxdatlqgvdcvyfdxywf/functions

This comprehensive logging will help us pinpoint EXACTLY where the failure is occurring!
