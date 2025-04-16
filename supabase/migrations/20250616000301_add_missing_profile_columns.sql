-- Add missing columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN use_service_address_for_billing BOOLEAN DEFAULT true,
ADD COLUMN notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}';

COMMENT ON COLUMN public.profiles.use_service_address_for_billing IS 'Indicates if the service address should be used for billing.';
COMMENT ON COLUMN public.profiles.notification_preferences IS 'User notification preferences (email, push, sms).';
