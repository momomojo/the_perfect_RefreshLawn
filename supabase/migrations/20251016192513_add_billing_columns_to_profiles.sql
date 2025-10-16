-- Add billing address columns to profiles table
-- These columns are used by the profile page for billing address management

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS billing_address_line1 TEXT,
ADD COLUMN IF NOT EXISTS billing_address_line2 TEXT,
ADD COLUMN IF NOT EXISTS billing_city TEXT,
ADD COLUMN IF NOT EXISTS billing_state TEXT,
ADD COLUMN IF NOT EXISTS billing_zip TEXT,
ADD COLUMN IF NOT EXISTS billing_country TEXT DEFAULT 'US';

-- Add comment to document these columns
COMMENT ON COLUMN public.profiles.billing_address_line1 IS 'First line of billing address';
COMMENT ON COLUMN public.profiles.billing_address_line2 IS 'Second line of billing address (optional)';
COMMENT ON COLUMN public.profiles.billing_city IS 'Billing address city';
COMMENT ON COLUMN public.profiles.billing_state IS 'Billing address state/province';
COMMENT ON COLUMN public.profiles.billing_zip IS 'Billing address ZIP/postal code';
COMMENT ON COLUMN public.profiles.billing_country IS 'Billing address country code (ISO 3166-1 alpha-2)';
