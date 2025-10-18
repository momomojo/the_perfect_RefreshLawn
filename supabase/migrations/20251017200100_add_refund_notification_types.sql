-- Migration: Add refund notification types to notifications constraint
-- Description: Adds refund_requested, refund_approved, and refund_rejected to allowed notification types

-- Drop the old constraint
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the updated constraint with refund types
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (type = ANY (ARRAY[
  'booking_created',
  'booking_updated',
  'booking_cancelled',
  'review_received',
  'payment_processed',
  'message',
  'payment_confirmation',
  'booking_scheduled',
  'service_update',
  'payment_issue',
  'payment_processing',
  'payment_confirmed',
  'service_in_progress',
  'service_completed',
  'payment_failed',
  'payment_refunded',
  'booking_refunded',
  'refund_requested',
  'refund_approved',
  'refund_rejected'
]));
