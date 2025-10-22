-- Add "Available Now" toggle field to profiles table
-- This allows technicians to instantly go on/off duty like DoorDash

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_actively_accepting_bookings boolean DEFAULT true NOT NULL;

COMMENT ON COLUMN public.profiles.is_actively_accepting_bookings IS 'Quick toggle for technicians to go on/off duty. When false, they will not receive new booking assignments even if they have availability set.';

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_profiles_accepting_bookings
ON public.profiles(is_actively_accepting_bookings)
WHERE role = 'technician' AND is_actively_accepting_bookings = true;

COMMENT ON INDEX idx_profiles_accepting_bookings IS 'Optimizes queries for finding actively accepting technicians';
