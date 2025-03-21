-- Migration: Add Notification System
-- Description: Creates a notification table and triggers for user alerts
-- Version: 20250525000000

-- Create notifications table for app-level notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('booking_created', 'booking_updated', 'booking_cancelled', 'review_received', 'payment_processed', 'message')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on the notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read only their own notifications
DROP POLICY IF EXISTS users_read_own_notifications ON notifications;
CREATE POLICY users_read_own_notifications
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy to allow admins to manage all notifications
DROP POLICY IF EXISTS admin_manage_all_notifications ON notifications;
CREATE POLICY admin_manage_all_notifications
    ON notifications FOR ALL
    USING (auth.is_admin());

-- Create function to create a notification for a user
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark a notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
  p_notification_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_success BOOLEAN;
BEGIN
  UPDATE notifications 
  SET is_read = TRUE 
  WHERE id = p_notification_id 
  AND user_id = auth.uid();
  
  GET DIAGNOSTICS v_success = ROW_COUNT;
  RETURN v_success > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read() 
RETURNS BOOLEAN AS $$
DECLARE
  v_success BOOLEAN;
BEGIN
  UPDATE notifications 
  SET is_read = TRUE 
  WHERE user_id = auth.uid() 
  AND is_read = FALSE;
  
  GET DIAGNOSTICS v_success = ROW_COUNT;
  RETURN v_success > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function to automatically create notifications when bookings change
CREATE OR REPLACE FUNCTION notify_on_booking_change()
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

-- Create trigger for booking changes
DROP TRIGGER IF EXISTS trg_notify_on_booking_change ON bookings;
CREATE TRIGGER trg_notify_on_booking_change
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_booking_change();

-- Create a trigger function for review notifications
CREATE OR REPLACE FUNCTION notify_on_review_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify technician when they receive a review
  PERFORM create_notification(
    NEW.technician_id,
    'review_received',
    'New Review Received',
    'You received a ' || NEW.rating || '-star review from a customer.',
    jsonb_build_object('review_id', NEW.id, 'booking_id', NEW.booking_id, 'rating', NEW.rating)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for review notifications
DROP TRIGGER IF EXISTS trg_notify_on_review_created ON reviews;
CREATE TRIGGER trg_notify_on_review_created
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_review_created();

-- Add functions to get unread notifications count
CREATE OR REPLACE FUNCTION get_unread_notifications_count() 
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = auth.uid()
    AND is_read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 