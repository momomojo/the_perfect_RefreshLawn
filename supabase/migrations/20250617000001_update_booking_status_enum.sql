-- Migration: Extend booking_status enum with payment-related states

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
    WHERE pg_type.typname = 'booking_status' AND pg_enum.enumlabel = 'payment_processing'
  ) THEN
    ALTER TYPE public.booking_status ADD VALUE 'payment_processing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
    WHERE pg_type.typname = 'booking_status' AND pg_enum.enumlabel = 'payment_failed'
  ) THEN
    ALTER TYPE public.booking_status ADD VALUE 'payment_failed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
    WHERE pg_type.typname = 'booking_status' AND pg_enum.enumlabel = 'payment_confirmed'
  ) THEN
    ALTER TYPE public.booking_status ADD VALUE 'payment_confirmed';
  END IF;
END $$; 