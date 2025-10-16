-- Fix notification type constraint to include 'booking_completed'
-- Migration created: 2025-10-15
-- Issue: Notification type enum doesn't include 'booking_completed' which is used in code

-- Drop existing constraint
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add updated constraint with 'booking_completed'
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'booking_created',
  'booking_updated',
  'booking_cancelled',
  'booking_completed',   -- Added
  'review_received',
  'payment_processed',
  'message'
));

COMMENT ON CONSTRAINT notifications_type_check ON public.notifications
IS 'Valid notification types including booking_completed for job completion notifications';
