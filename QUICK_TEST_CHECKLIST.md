# Quick Test Checklist - Stripe Edge Function Fix

## 🚀 What We Just Did

1. ✅ Added **comprehensive logging** to stripe-customer-api edge function
2. ✅ Deployed **version 9** to production
3. ✅ Verified all **secrets are configured** correctly
4. ✅ Added logging to **track exactly where the failure occurs**

---

## 📋 Your Testing Checklist

### Step 1: Test the Booking Flow (5 minutes)

1. Open the app and login as **claireherman135@gmail.com**
2. Navigate: **Services → Basic Lawn Mowing**
3. Fill out:
   - ✓ Date: October 16
   - ✓ Time: 10:00 AM
   - ✓ Address: (confirm your address)
   - ✓ Frequency: (select any option)
4. **Stop at Payment Method step** and observe:
   - [ ] Does it show "Loading cards..."?
   - [ ] Does it show an error message?
   - [ ] Does it load successfully?
   - [ ] What exact error message appears (if any)?

### Step 2: Check the Logs (2 minutes)

**Go to:** https://supabase.com/dashboard/project/iqxdatlqgvdcvyfdxywf/functions/stripe-customer-api/logs

**Look for the most recent logs** (should be from just now)

**Quick scan - do you see:**
- [ ] "=== STRIPE-CUSTOMER-API REQUEST START ===" (shows request started)
- [ ] "STRIPE_SECRET_KEY: Set (starts with sk_test...)" (shows key is present)
- [ ] "User verified successfully" (shows auth worked)
- [ ] "Routing to: handleListPaymentMethods" (shows routing worked)
- [ ] Any error messages with stack traces

### Step 3: Report Back

**Copy and paste the following template with your findings:**

```
## Test Results

### App Behavior:
- Loading state: [infinite loading / error / success / other]
- Error message (if any): [paste exact message]
- Browser console errors: [paste if any]

### Edge Function Logs:
- Version seen in dashboard: [should be 9]
- STRIPE_SECRET_KEY status: [Set / NOT SET]
- User verification: [success / failed]
- Error messages: [paste any error lines from logs]

### Log Screenshot:
[paste screenshot or full log output here]
```

---

## 🔍 What We're Looking For

The logs will tell us EXACTLY where it's failing:

| If you see this in logs | It means |
|------------------------|----------|
| "STRIPE_SECRET_KEY: NOT SET" | Secrets not injected into runtime - need to troubleshoot secret configuration |
| "Failed to parse request body" | Request format issue between frontend and backend |
| "Missing 'path' in request body" | Request structure mismatch |
| "Auth header present: false" | Frontend not sending auth token correctly |
| "User verification failed" | JWT token expired or invalid |
| Stripe API error after routing | Stripe customer doesn't exist or API key issue |
| All logs succeed, returns 200 | **IT WORKS!** 🎉 |

---

## ⏱️ Quick Timing Reference

- **Last deployment:** Just now (version 9)
- **Test user:** claireherman135@gmail.com
- **Expected log location:** Dashboard → Functions → stripe-customer-api → Logs tab
- **Time to complete test:** ~5-7 minutes

---

## 🆘 If You See Immediate Success

If the payment method page loads and shows either:
- Your saved cards, OR
- "No payment methods" message

**Then it's fixed!** The 400 errors were likely due to:
- Old edge function version cached
- Secrets not being available to previous deployment
- Now resolved with version 9

---

## 📞 Next Steps Based on Results

**If it works:**
- Remove debug logging for cleaner production logs
- Mark issue as resolved
- Continue with booking workflow testing

**If it still fails:**
- The detailed logs will show EXACTLY where
- I can create a targeted fix based on the specific failure point
- No more guessing!

---

Ready to test? The enhanced edge function is live and waiting!
