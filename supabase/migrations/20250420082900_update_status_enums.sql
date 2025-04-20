-- Migration: Update Status Enums
-- Description: Adds missing status values used by Stripe webhooks to relevant enum types.

-- Add payment-related statuses to booking_status
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'payment_confirmed';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'payment_failed';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'payment_refunded';

-- Attempt to add common Stripe statuses to subscription_status if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'active';
    ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'past_due';
    ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'unpaid';
    ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'canceled';
    ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'incomplete';
    ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'incomplete_expired';
    ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'trialing';
    RAISE NOTICE 'Added values to public.subscription_status';
  ELSE
    RAISE NOTICE 'Type public.subscription_status does not exist, skipping modification.';
  END IF;
END;
$$;

-- Attempt to add common Stripe statuses to invoice_status if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'draft';
    ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'open';
    ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'paid';
    ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'uncollectible';
    ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'void';
    RAISE NOTICE 'Added values to public.invoice_status';
  ELSE
    RAISE NOTICE 'Type public.invoice_status does not exist, skipping modification.';
  END IF;
END;
$$;
