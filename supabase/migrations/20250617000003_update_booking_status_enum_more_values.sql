-- Migration: Extend booking_status enum with missing live values

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'booking_status' AND e.enumlabel = 'pending_payment'
  ) THEN
    ALTER TYPE public.booking_status ADD VALUE 'pending_payment';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'booking_status' AND e.enumlabel = 'payment_refunded'
  ) THEN
    ALTER TYPE public.booking_status ADD VALUE 'payment_refunded';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'booking_status' AND e.enumlabel = 'refunded'
  ) THEN
    ALTER TYPE public.booking_status ADD VALUE 'refunded';
  END IF;
END $$; 