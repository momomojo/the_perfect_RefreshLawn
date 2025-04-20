-- Migration: Define ENUMs for subscription and invoice status

-- Create subscription_status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'subscription_status'
  ) THEN
    CREATE TYPE public.subscription_status AS ENUM (
      'active', 'trialing', 'past_due', 'canceled', 'unpaid'
    );
  END IF;
END $$;

-- Alter subscriptions.status to use subscription_status
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    WHERE c.relname = 'subscriptions' AND a.attname = 'status'
      AND a.atttypid <> 'public.subscription_status'::regtype
  ) THEN
    ALTER TABLE public.subscriptions
      ALTER COLUMN status TYPE public.subscription_status
      USING status::public.subscription_status;
  END IF;
END $$;

-- Create invoice_status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'invoice_status'
  ) THEN
    CREATE TYPE public.invoice_status AS ENUM (
      'draft', 'open', 'paid', 'uncollectible', 'void'
    );
  END IF;
END $$;

-- Alter invoices.status to use invoice_status
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    WHERE c.relname = 'invoices' AND a.attname = 'status'
      AND a.atttypid <> 'public.invoice_status'::regtype
  ) THEN
    ALTER TABLE public.invoices
      ALTER COLUMN status TYPE public.invoice_status
      USING status::public.invoice_status;
  END IF;
END $$; 