-- Migration: Fix notification function parameters
-- Description: Updates the create_notification function and ensures consistent parameter usage

-- First, let's ensure the create_notification function has the correct signature
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL::jsonb
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'pg_catalog', 'public';

-- Also update the notify_on_booking_change function to ensure it calls create_notification correctly
CREATE OR REPLACE FUNCTION public.notify_on_booking_change()
RETURNS TRIGGER AS $$
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
    
    -- Notify admins
    PERFORM create_notification(
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on functions for better documentation
COMMENT ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, JSONB) IS 'Creates a notification for a user with specified title, message, and data';
COMMENT ON FUNCTION public.notify_on_booking_change() IS 'Trigger function that automatically creates notifications for booking status changes';
