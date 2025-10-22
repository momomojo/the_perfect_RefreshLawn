# URGENT: Stripe Webhook Registration Required

## Status: FIX VERIFIED - WEBHOOK REGISTRATION NEEDED

The payment redirect bug has been **successfully fixed**. The polling mechanism is working perfectly. However, the booking cannot be created because the Stripe webhook is not registered.

---

## What's Working ✅

1. Payment succeeds inline without redirect
2. Polling mechanism activates correctly
3. Client polls every 1 second for 30 seconds
4. Graceful error handling with user-friendly message
5. PaymentIntent created successfully: `pi_3SJ2J5RrbfpuJcWV0VL4WKt2`

---

## What's Missing ❌

The Stripe webhook is deployed to Supabase but **NOT registered in the Stripe Dashboard**. This means Stripe doesn't know where to send payment events.

---

## How to Fix (5 Minutes)

### Step 1: Open Stripe Dashboard

1. Go to https://dashboard.stripe.com
2. Navigate to **Developers** → **Webhooks**
3. Click **"Add endpoint"** button

### Step 2: Configure Webhook Endpoint

Fill in the following details:

**Endpoint URL:**

```
https://iqxdatlqgvdcvyfdxywf.supabase.co/functions/v1/stripe-webhook
```

**Description:** (optional)

```
RefreshLawn Production Webhook - Booking Creation
```

**Events to send:**
Select these two events:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`

### Step 3: Copy Webhook Signing Secret

1. After creating the endpoint, Stripe will show a **signing secret**
2. It looks like: `whsec_xxxxxxxxxxxxxxxxxxxxx`
3. Copy this value

### Step 4: Update Supabase Environment Variable

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `RefreshLawn`
3. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
4. Look for variable: `STRIPE_WEBHOOK_SECRET`
5. If it exists, verify it matches the signing secret from Step 3
6. If it doesn't exist, add it:
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_xxxxxxxxxxxxxxxxxxxxx` (from Step 3)

### Step 5: Verify Deployment

Check that the webhook edge function is deployed:

```bash
supabase functions list
```

You should see `stripe-webhook` in the list with status: **deployed**.

---

## Testing After Registration

### Test Case

Repeat the exact same booking flow:

1. Login as: claireherman135@gmail.com
2. Book service: Basic Lawn Mowing
3. Date: Tomorrow
4. Time: 11:00 AM
5. Address: 456 Fixed Street
6. Payment: Use test card 4242 4242 4242 4242

### Expected Result

- Payment succeeds ✅
- Console shows: "Waiting for webhook to create booking..." ✅
- Console shows: "Checking for booking (attempt 1/30)..." ✅
- **Within 3-10 seconds:**
  - Console shows: "✅ Booking created by webhook! Booking ID: xxxxx"
  - Success modal appears
  - Redirect to dashboard
  - New booking visible on dashboard

---

## Monitoring Webhook Activity

### Real-Time Logs

Monitor webhook execution during testing:

```bash
supabase functions logs stripe-webhook --tail
```

### What to Look For

**Success logs:**

```
Webhook received: payment_intent.succeeded
Payment Intent ID: pi_xxxxx
Creating booking for customer: 68ef7057-9c22-48c5-98a9-362588fdbb49
Booking created successfully: booking-id-xxxxx
```

**Error logs (if any):**

- Missing metadata
- Database insertion errors
- RLS policy failures

---

## Stripe Dashboard Webhook Verification

### After Registration, Check:

1. **Webhook Status:** Should show as "Enabled"
2. **Recent deliveries:** You'll see delivery attempts after test payments
3. **Response codes:**
   - `200` = Success ✅
   - `400/500` = Error (check logs)

### Test Webhook (Optional)

Stripe allows you to send test events:

1. Go to webhook details
2. Click "Send test webhook"
3. Select event: `payment_intent.succeeded`
4. Check if booking is created in database

---

## Troubleshooting

### Problem: Webhook shows 401 Unauthorized

**Cause:** Missing or incorrect `STRIPE_WEBHOOK_SECRET`
**Fix:** Verify environment variable in Supabase matches webhook signing secret

### Problem: Webhook shows 500 Internal Server Error

**Cause:** Edge function error during execution
**Fix:** Check function logs for error details:

```bash
supabase functions logs stripe-webhook --tail
```

### Problem: Webhook succeeds but no booking created

**Cause:** Database RLS policy or missing metadata
**Fix:**

1. Check metadata in PaymentIntent includes:
   - `customer_id`
   - `service_id`
   - `scheduled_date`
   - `scheduled_time`
   - `service_address`
2. Verify RLS policies allow webhook (uses service role key)

### Problem: Timeout still occurs after webhook registration

**Cause:** Webhook is registered but not receiving events
**Fix:**

1. Verify webhook URL is exactly: `https://iqxdatlqgvdcvyfdxywf.supabase.co/functions/v1/stripe-webhook`
2. Check webhook is listening for `payment_intent.succeeded`
3. Verify webhook is enabled (not disabled)

---

## Environment Variables Checklist

Ensure these are set in Supabase Edge Functions:

| Variable                    | Example Value                  | Required |
| --------------------------- | ------------------------------ | -------- |
| `STRIPE_SECRET_KEY`         | `sk_test_...` or `sk_live_...` | ✅       |
| `STRIPE_WEBHOOK_SECRET`     | `whsec_...`                    | ✅       |
| `SUPABASE_URL`              | `https://xxx.supabase.co`      | ✅       |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...`                  | ✅       |

---

## Success Confirmation

After webhook registration and successful test, you should see:

### In Console

```
✅ Payment succeeded inline, calling onPaymentSuccess
✅ Payment successful for PaymentIntent: pi_xxxxx
⏳ Waiting for webhook to create booking...
📡 Checking for booking (attempt 1/30)...
📡 Checking for booking (attempt 2/30)...
📡 Checking for booking (attempt 3/30)...
✅ Booking created by webhook! Booking ID: xxxxx
🎉 Booking confirmed! Redirecting to dashboard...
```

### In Database

```sql
SELECT * FROM bookings
WHERE customer_id = '68ef7057-9c22-48c5-98a9-362588fdbb49'
ORDER BY created_at DESC
LIMIT 1;
```

Should show the new booking with status: `payment_confirmed` or `scheduled`

### On Dashboard

Customer sees the new booking in their "Upcoming Appointments" section.

---

## Timeline

- **Before fix:** Payment redirected browser, polling never started ❌
- **After fix (current state):** Polling works, but webhook doesn't fire due to missing registration 🟡
- **After webhook registration:** Complete end-to-end flow works perfectly ✅

**Estimated time to complete:** 5-10 minutes

---

**Last Updated:** 2025-10-17
**Next Action:** Register webhook in Stripe Dashboard
**Blocker:** Webhook registration
**Impact:** Payment succeeds but booking not created (high priority)
