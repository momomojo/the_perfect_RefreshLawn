# Stripe Integration Plan – Lawn Refresh

## Overview
This plan describes how to connect the existing Stripe backend (Edge Functions, DB schema, webhooks) to the frontend, implementing a “payment before booking” flow for the Lawn Refresh app.

---

## 1. Prerequisites (Already Done)
- Supabase tables for Stripe data (`customers`, `payments`, `subscriptions`, `invoices`, `payment_methods`).
- Edge Functions: `stripe-api` (all customer/admin endpoints), `stripe-webhook` (syncs Stripe events to DB).
- Stripe secrets set as Supabase environment variables.
- Webhook endpoint configured in Stripe dashboard.

---

## 2. Implementation Steps

### 2.1. Create Payment UI Component (Web)
- **File:** `components/payment/StripePaymentWeb.tsx`
- Use `@stripe/react-stripe-js` and `@stripe/stripe-js`.
- Render a payment form using Stripe Elements.
- On submit, call the `stripe-api/create-payment-intent` endpoint to create a PaymentIntent (amount, currency, user info).
- Confirm payment using Stripe.js and the client secret returned.
- On success, emit a callback to proceed with booking creation.

---

### 2.2. Update Booking Flow
- **File:** `app/(customer)/booking.tsx`
- After the user fills out the booking form and submits:
  - Show the Stripe payment UI.
  - Only after payment is confirmed, call your Supabase function to create the booking record, including the Stripe payment intent ID.
  - Set booking status to “paid” or “confirmed”.
- If payment fails, do not create the booking; show an error message.

---

### 2.3. Link Payment to Booking
- When creating a booking after payment, store the Stripe payment intent ID in the booking record for future reconciliation, refunds, or admin operations.

---

### 2.4. (Optional) Update Booking History & Admin Screens
- Show payment status and Stripe payment reference in booking history and admin dashboards.

---

### 2.5. Testing
- Use Stripe test mode and test cards.
- Test:
  - Payment success and failure flows.
  - Booking creation only after payment.
  - Webhook syncing for payment status.
  - Admin listing and refund flows.

---

## 3. File List (To Modify/Create)

| File                                           | Action   | Purpose                                 |
|------------------------------------------------|----------|-----------------------------------------|
| components/payment/StripePaymentWeb.tsx        | New      | Stripe Elements payment UI              |
| app/(customer)/booking.tsx                     | Modify   | Insert payment step before booking      |
| components/customer/BookingForm.tsx            | Modify   | Pass payment callbacks if needed        |
| (Booking history/admin screens, optional)      | Modify   | Show payment status                     |

---

## 4. Reference: Backend Architecture
- See previous sections for DB schema and Edge Function details.
- No changes needed to backend unless you want to add new endpoints or tweak webhook logic.

---

## 5. Rollout Steps (Order of Tasks)
1. **Create StripePaymentWeb.tsx** (Stripe Elements UI)
2. **Update booking.tsx** to require payment before booking creation
3. **Test end-to-end payment and booking flow**
4. (Optional) Update booking history/admin screens for payment status
5. Update this plan as needed after testing
