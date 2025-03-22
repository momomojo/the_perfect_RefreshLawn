-- Migration to fix security issues with functions
-- Date: 2025-06-10

-- Fix search_path security issue on functions by adding SET search_path = 'pg_catalog', 'public'
-- This prevents SQL injection attacks by ensuring functions use a specific search path

-- 1. Fix create_notification function
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_data jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'pg_catalog', 'public'
AS $function$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$function$;

-- 2. Fix mark_notification_read function
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'pg_catalog', 'public'
AS $function$
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
$function$;

-- 3. Fix mark_all_notifications_read function
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'pg_catalog', 'public'
AS $function$
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
$function$;

-- 4. Fix notify_on_booking_change function
CREATE OR REPLACE FUNCTION public.notify_on_booking_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'pg_catalog', 'public'
AS $function$
DECLARE
  v_title TEXT;
  v_message TEXT;
  v_type TEXT;
  v_data JSONB;
BEGIN
  -- This is a placeholder - specific implementation depends on your notification system
  IF TG_OP = 'INSERT' THEN
    v_type := 'booking_created';
    v_title := 'New Booking Created';
    v_message := 'A new booking has been created.';
  ELSIF TG_OP = 'UPDATE' THEN
    v_type := 'booking_updated';
    v_title := 'Booking Updated';
    v_message := 'Your booking has been updated.';
  END IF;

  -- Add booking data to notification
  v_data := jsonb_build_object('booking_id', NEW.id);

  -- Create notification for the customer
  PERFORM create_notification(
    NEW.customer_id, 
    v_type, 
    v_title, 
    v_message, 
    v_data
  );

  -- If there's a technician assigned, notify them too
  IF NEW.technician_id IS NOT NULL THEN
    PERFORM create_notification(
      NEW.technician_id, 
      v_type, 
      v_title, 
      v_message, 
      v_data
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 5. Fix notify_on_review_created function
CREATE OR REPLACE FUNCTION public.notify_on_review_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'pg_catalog', 'public'
AS $function$
DECLARE
  v_booking_id UUID;
  v_service_id UUID;
  v_data JSONB;
BEGIN
  -- Get the booking ID
  v_booking_id := NEW.booking_id;
  
  -- Get service ID from booking
  SELECT service_id INTO v_service_id FROM bookings WHERE id = v_booking_id;
  
  -- Create data for notification
  v_data := jsonb_build_object(
    'booking_id', v_booking_id,
    'review_id', NEW.id,
    'rating', NEW.rating
  );
  
  -- Notify the technician about the new review
  PERFORM create_notification(
    NEW.technician_id,
    'review_received',
    'New Review Received',
    'You have received a new review for your service.',
    v_data
  );
  
  RETURN NEW;
END;
$function$;

-- 6. Fix get_unread_notifications_count function
CREATE OR REPLACE FUNCTION public.get_unread_notifications_count()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'pg_catalog', 'public'
AS $function$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = auth.uid()
    AND is_read = FALSE
  );
END;
$function$;

-- 7. Fix get_users_with_email function with both search_path and type mismatch corrections
CREATE OR REPLACE FUNCTION public.get_users_with_email()
 RETURNS TABLE(id uuid, email text, banned_until timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'pg_catalog', 'public', 'auth'
AS $function$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email::text, au.banned_until
  FROM auth.users au;
END;
$function$;

-- Add comment to explain the purpose of the migration
COMMENT ON FUNCTION public.create_notification IS 'Creates a notification for a user with specified parameters (SECURITY DEFINER with search_path)';
COMMENT ON FUNCTION public.mark_notification_read IS 'Marks a notification as read (SECURITY DEFINER with search_path)';
COMMENT ON FUNCTION public.mark_all_notifications_read IS 'Marks all user notifications as read (SECURITY DEFINER with search_path)';
COMMENT ON FUNCTION public.notify_on_booking_change IS 'Trigger function for booking changes to create notifications (SECURITY DEFINER with search_path)';
COMMENT ON FUNCTION public.notify_on_review_created IS 'Trigger function for new reviews to create notifications (SECURITY DEFINER with search_path)';
COMMENT ON FUNCTION public.get_unread_notifications_count IS 'Gets count of unread notifications for current user (SECURITY DEFINER with search_path)';
COMMENT ON FUNCTION public.get_users_with_email IS 'Gets users with email from auth schema with type conversion (SECURITY DEFINER with search_path)'; 