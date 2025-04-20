-- Migration: Drop stripe_customer_id column from profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.profiles
      DROP COLUMN stripe_customer_id;
  END IF;
END
$$; 