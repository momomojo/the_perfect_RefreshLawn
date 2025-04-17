-- Add billing address columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN billing_address_line1 TEXT,
ADD COLUMN billing_address_line2 TEXT,
ADD COLUMN billing_city TEXT,
ADD COLUMN billing_state TEXT,
ADD COLUMN billing_postal_code TEXT,
ADD COLUMN billing_country TEXT;

COMMENT ON COLUMN public.profiles.billing_address_line1 IS 'Billing address line 1 for the user.';
COMMENT ON COLUMN public.profiles.billing_address_line2 IS 'Billing address line 2 for the user.';
COMMENT ON COLUMN public.profiles.billing_city IS 'Billing city for the user.';
COMMENT ON COLUMN public.profiles.billing_state IS 'Billing state or province for the user.';
COMMENT ON COLUMN public.profiles.billing_postal_code IS 'Billing postal code for the user.';
COMMENT ON COLUMN public.profiles.billing_country IS 'Billing country for the user.';
