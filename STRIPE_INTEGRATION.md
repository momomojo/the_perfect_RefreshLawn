# Stripe Integration for Lawn Refresh

This document outlines the Stripe integration setup for the Lawn Refresh application.

## Overview

The integration uses a streamlined approach focusing entirely on Supabase Edge Functions and local database tables for efficient and secure Stripe interactions:

- **Edge Functions**: All Stripe API calls (customer-facing, admin operations, and webhook handling) are managed through dedicated Supabase Edge Functions.
- **React Native SDK**: Utilized on the client-side for handling payment elements and confirming payments.
- **Local Database Mirror**: Supabase tables in the `public` schema store relevant Stripe object data (customers, subscriptions, payments, invoices) synced via webhooks.

This approach avoids the complexities and potential latency of Foreign Data Wrappers (FDW).

## Configuration

### API Keys

The following Stripe API keys are configured as Supabase secrets:

- `STRIPE_SECRET_KEY`: Used by Edge Functions for server-side Stripe API calls.
- `STRIPE_PUBLISHABLE_KEY`: Used by the React Native client for interacting with Stripe.js elements.
- `STRIPE_WEBHOOK_SECRET`: Used by the `stripe-webhook` Edge Function to verify the authenticity of incoming webhook events.

### Webhook Configuration

A webhook endpoint is configured in Stripe to point to the deployed `stripe-webhook` Edge Function:

```
https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook
```

This webhook listens for critical Stripe events to keep the local database synchronized:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.updated`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## Database Schema

The following tables reside in the `public` schema and mirror essential Stripe data:

### customers

Links Supabase users (`auth.users`) with Stripe customer records.

| Column             | Type        | Description                   |
| ------------------ | ----------- | ----------------------------- |
| id                 | UUID        | Primary key (references user) |
| stripe_customer_id | TEXT        | Unique Stripe customer ID     |
| email              | TEXT        | Customer email                |
| name               | TEXT        | Customer name (optional)      |
| phone              | TEXT        | Customer phone (optional)     |
| created_at         | TIMESTAMPTZ | Record creation timestamp     |
| updated_at         | TIMESTAMPTZ | Record last update timestamp  |

### subscriptions

Stores details of customer subscriptions.

| Column                 | Type        | Description                                      |
| ---------------------- | ----------- | ------------------------------------------------ |
| id                     | UUID        | Primary key                                      |
| user_id                | UUID        | Reference to `public.customers` (user)           |
| stripe_subscription_id | TEXT        | Unique Stripe subscription ID                    |
| stripe_customer_id     | TEXT        | Reference to `customers.stripe_customer_id`      |
| status                 | TEXT        | Stripe subscription status (e.g., `active`)      |
| price_id               | TEXT        | Stripe Price ID associated with the subscription |
| current_period_start   | TIMESTAMPTZ | Start timestamp of the current billing period    |
| current_period_end     | TIMESTAMPTZ | End timestamp of the current billing period      |
| canceled_at            | TIMESTAMPTZ | Timestamp when the subscription was canceled     |
| created_at             | TIMESTAMPTZ | Record creation timestamp                        |
| updated_at             | TIMESTAMPTZ | Record last update timestamp                     |

### payments

Records individual payment attempts (Payment Intents).

| Column             | Type        | Description                                  |
| ------------------ | ----------- | -------------------------------------------- |
| id                 | UUID        | Primary key                                  |
| user_id            | UUID        | Reference to `public.customers` (user)       |
| stripe_payment_id  | TEXT        | Unique Stripe Payment Intent ID              |
| stripe_customer_id | TEXT        | Reference to `customers.stripe_customer_id`  |
| amount             | INTEGER     | Payment amount in the smallest currency unit |
| currency           | TEXT        | Three-letter ISO currency code               |
| status             | TEXT        | Payment Intent status (e.g., `succeeded`)    |
| payment_method     | TEXT        | Stripe Payment Method ID used                |
| error_message      | TEXT        | Error message if payment failed              |
| created_at         | TIMESTAMPTZ | Record creation timestamp                    |

### invoices

Stores details of Stripe invoices.

| Column                 | Type        | Description                                         |
| ---------------------- | ----------- | --------------------------------------------------- |
| id                     | UUID        | Primary key                                         |
| user_id                | UUID        | Reference to `public.customers` (user)              |
| stripe_invoice_id      | TEXT        | Unique Stripe Invoice ID                            |
| stripe_customer_id     | TEXT        | Reference to `customers.stripe_customer_id`         |
| stripe_subscription_id | TEXT        | Reference to `subscriptions.stripe_subscription_id` |
| amount_paid            | INTEGER     | Amount paid (in smallest currency unit)             |
| currency               | TEXT        | Three-letter ISO currency code                      |
| status                 | TEXT        | Invoice status (e.g., `paid`, `open`)               |
| invoice_pdf            | TEXT        | URL to the downloadable invoice PDF                 |
| created_at             | TIMESTAMPTZ | Record creation timestamp                           |

## Edge Functions

### stripe-api

Provides endpoints for client-side and admin interactions with Stripe.

**Customer-Facing Endpoints:**

- `/create-payment-intent`: Creates a Stripe Payment Intent for one-time purchases.
- `/create-customer`: Ensures a Stripe customer exists for the authenticated Supabase user.
- `/create-subscription`: Initiates a new subscription for a customer.
- `/list-payment-methods`: Retrieves saved payment methods for the user.
- `/attach-payment-method`: Attaches a new payment method to the user's Stripe customer.
- `/detach-payment-method`: Removes a saved payment method.
- `/set-default-payment`: Sets a default payment method for subscriptions.
- `/cancel-subscription`: Cancels an active subscription.
- `/list-invoices`: Fetches the user's invoice history.

**Admin Endpoints (Requires appropriate RBAC checks):**

- `/admin-list-customers`: Lists all Stripe customers managed by the application.
- `/admin-list-subscriptions`: Lists all subscriptions.
- `/admin-list-payments`: Lists all payment intents.
- `/admin-list-invoices`: Lists all invoices.
- `/admin-get-stripe-dashboard-link`: Generates a direct link to the Stripe Dashboard for a specific object (customer, subscription, etc.).
- `/admin-cancel-subscription`: Allows an admin to cancel a user's subscription.

### stripe-webhook

Handles incoming webhook events from Stripe.

- Verifies webhook signature using `STRIPE_WEBHOOK_SECRET`.
- Parses the event payload.
- Updates the corresponding local database tables (`customers`, `subscriptions`, `payments`, `invoices`) based on the event type.
- Ensures data consistency between Stripe and the application database.

## Row Level Security (RLS)

RLS policies are applied to the `public` schema tables (`customers`, `subscriptions`, `payments`, `invoices`) to ensure:

- **User Isolation**: Authenticated users can only access their own related data (e.g., their customer record, subscriptions, payments).
- **Service Role Access**: Edge Functions, which run with the `service_role`, bypass RLS policies and can perform necessary operations across all user data (e.g., updating records based on webhooks, admin actions).

## Setup & Deployment

1.  **Apply Migrations**: Ensure all database migrations, including the one creating the Stripe-related tables and the one removing FDW attempts, are applied:
    ```bash
    supabase db push
    ```
2.  **Deploy Edge Functions**: Deploy both Edge Functions:
    ```bash
    supabase functions deploy stripe-api
    supabase functions deploy stripe-webhook
    ```
    _Ensure Supabase secrets (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`) are set in your Supabase project settings._\_.

## Testing Strategy

Refer to the `lawn-refresh-testing-strategy` rule/document for detailed testing procedures involving Stripe test mode, test cards, and webhook verification.

Key test areas:

- Customer creation flow.
- One-time payment processing (success and failure).
- Subscription creation, update (e.g., plan change), and cancellation.
- Webhook handling and data synchronization verification.
- Payment method management (add, list, detach, set default).
- Admin endpoint functionality (listing, cancellation).

Use Stripe's test mode and provided test card numbers for all testing.
