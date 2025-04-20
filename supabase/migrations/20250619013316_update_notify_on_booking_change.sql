-- Migration: Update notify_on_booking_change to use safer function calls
-- Description: Updates the trigger function to use the new create_notification_safe wrapper

CREATE OR REPLACE FUNCTION public.notify_on_booking_change()
RETURNS TRIGGER AS $$
BEGIN
  -- New booking created
  IF TG_OP = 'INSERT' THEN
    -- Notify customer
    PERFORM public.create_notification_safe(
      NEW.customer_id,
      'booking_created',
      'New Booking Created',
      'Your booking for ' || (SELECT name FROM services WHERE id = NEW.service_id) || ' has been created.',
      jsonb_build_object('booking_id', NEW.id, 'service_id', NEW.service_id)
    );
    
    -- Notify admins
    PERFORM public.create_notification_safe(
      admin_id,
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
      PERFORM public.create_notification_safe(
        NEW.customer_id,
        'booking_updated',
        'Booking Scheduled',
        'Your booking has been scheduled for ' || NEW.scheduled_date || ' at ' || NEW.scheduled_time,
        jsonb_build_object('booking_id', NEW.id, 'status', NEW.status)
      );
      
      -- If technician assigned, notify them
      IF NEW.technician_id IS NOT NULL THEN
        PERFORM public.create_notification_safe(
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
      PERFORM public.create_notification_safe(
        NEW.customer_id,
        'booking_updated',
        'Service Completed',
        'Your service has been completed. Please leave a review!',
        jsonb_build_object('booking_id', NEW.id)
      );
    
    -- Status changed to cancelled
    ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      -- Notify customer
      PERFORM public.create_notification_safe(
        NEW.customer_id,
        'booking_cancelled',
        'Booking Cancelled',
        'Your booking has been cancelled.',
        jsonb_build_object('booking_id', NEW.id)
      );
      
      -- Notify technician if assigned
      IF NEW.technician_id IS NOT NULL THEN
        PERFORM public.create_notification_safe(
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
EXCEPTION WHEN OTHERS THEN
  -- Add error handling to ensure trigger doesn't cause transactions to fail
  RAISE WARNING 'Error in booking notification trigger: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'pg_catalog', 'public';

COMMENT ON FUNCTION public.notify_on_booking_change() IS 'Trigger function that automatically creates notifications for booking status changes with improved error handling'; 