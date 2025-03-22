-- Migration file to combine all fixes for the booking system
-- Date: 2025-06-02

-- 1. Fix notify_on_booking_change function to use correct column name
CREATE OR REPLACE FUNCTION public.notify_on_booking_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- New booking created
  IF TG_OP = 'INSERT' THEN
    -- Notify customer
    PERFORM create_notification(
      NEW.customer_id,
      'booking_created',
      'New Booking Created',
      'Your booking for ' || (SELECT name FROM services WHERE id = NEW.service_id) || ' has been created.',
      jsonb_build_object('booking_id', NEW.id, 'service_id', NEW.service_id)
    );
    
    -- Notify admins (fixed: using id instead of admin_id)
    PERFORM create_notification(
      id,  -- Changed from admin_id to id
      'booking_created',
      'New Booking Received',
      'A new booking has been created by a customer.',
      jsonb_build_object('booking_id', NEW.id, 'customer_id', NEW.customer_id)
    )
    FROM profiles
    WHERE role = 'admin';
    
  -- Booking updated
  ELSIF TG_OP = 'UPDATE' THEN
    -- Status changed to scheduled
    IF NEW.status = 'scheduled' AND OLD.status = 'pending' THEN
      -- Notify customer
      PERFORM create_notification(
        NEW.customer_id,
        'booking_updated',
        'Booking Scheduled',
        'Your booking has been scheduled for ' || NEW.scheduled_date || ' at ' || NEW.scheduled_time,
        jsonb_build_object('booking_id', NEW.id, 'status', NEW.status)
      );
      
      -- If technician assigned, notify them
      IF NEW.technician_id IS NOT NULL THEN
        PERFORM create_notification(
          NEW.technician_id,
          'booking_updated',
          'New Job Assigned',
          'You have been assigned a new job on ' || NEW.scheduled_date,
          jsonb_build_object('booking_id', NEW.id, 'customer_id', NEW.customer_id)
        );
      END IF;
    
    -- Status changed to completed
    ELSIF NEW.status = 'completed' AND OLD.status = 'in_progress' THEN
      -- Notify customer
      PERFORM create_notification(
        NEW.customer_id,
        'booking_updated',
        'Service Completed',
        'Your service has been completed. Please leave a review!',
        jsonb_build_object('booking_id', NEW.id)
      );
    
    -- Status changed to cancelled
    ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      -- Notify customer
      PERFORM create_notification(
        NEW.customer_id,
        'booking_cancelled',
        'Booking Cancelled',
        'Your booking has been cancelled.',
        jsonb_build_object('booking_id', NEW.id)
      );
      
      -- Notify technician if assigned
      IF NEW.technician_id IS NOT NULL THEN
        PERFORM create_notification(
          NEW.technician_id,
          'booking_cancelled',
          'Job Cancelled',
          'A job assigned to you has been cancelled.',
          jsonb_build_object('booking_id', NEW.id)
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Drop and recreate the trigger to ensure it's using the updated function
DROP TRIGGER IF EXISTS trg_notify_on_booking_change ON bookings;
CREATE TRIGGER trg_notify_on_booking_change
  AFTER INSERT OR UPDATE
  ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_booking_change();

-- 2. Create a function to safely fetch auth users with their emails
CREATE OR REPLACE FUNCTION get_users_with_email()
RETURNS TABLE (
  id uuid,
  email text,
  banned_until timestamptz
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email, au.banned_until
  FROM auth.users au;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_users_with_email() TO authenticated;

-- Add comments explaining the fixes
COMMENT ON FUNCTION public.notify_on_booking_change() IS 'Trigger function to send notifications when bookings are created or updated. Fixed to use correct column name (id) for admin notifications.';

COMMENT ON FUNCTION get_users_with_email() IS 'Returns auth user information including email for use in the admin dashboard. This function is used as a workaround for the direct join between profiles and auth.users tables.';

-- 3. Ensure notifications can be properly delivered
-- Update notification policies to ensure proper access
DROP POLICY IF EXISTS users_read_own_notifications ON notifications;
CREATE POLICY users_read_own_notifications
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Add policy for users to update their notifications (mark as read)
DROP POLICY IF EXISTS users_update_own_notifications ON notifications;
CREATE POLICY users_update_own_notifications
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id AND is_read = true);  -- Only allow marking as read 