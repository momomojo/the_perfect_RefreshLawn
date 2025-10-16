-- Add missing performance indexes
-- Migration created: 2025-10-15
-- Recommendation from backend audit

-- Add index for notification queries (user + read status)
CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read
ON public.notifications(user_id, is_read);

-- Add index for booking status queries
CREATE INDEX IF NOT EXISTS idx_bookings_status_date
ON public.bookings(status, scheduled_date);

-- Add index for reviews by technician
CREATE INDEX IF NOT EXISTS idx_reviews_technician_id
ON public.reviews(technician_id);

-- Add index for payment methods by customer
CREATE INDEX IF NOT EXISTS idx_payment_methods_customer
ON public.payment_methods(customer_id, is_default);

COMMENT ON INDEX idx_notifications_user_is_read IS 'Optimize notification queries filtered by user and read status';
COMMENT ON INDEX idx_bookings_status_date IS 'Optimize booking queries filtered by status and date';
COMMENT ON INDEX idx_reviews_technician_id IS 'Optimize review lookups by technician';
COMMENT ON INDEX idx_payment_methods_customer IS 'Optimize payment method queries with default flag';
