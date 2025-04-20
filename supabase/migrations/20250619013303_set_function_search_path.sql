-- Migration to set search_path for potentially vulnerable functions
-- Addresses Supabase Advisor warning: function_search_path_mutable

----------------------------------------------------------------------
-- Function: assign_booking_technician
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_booking_technician(p_booking_id uuid, p_technician_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' -- Added search_path setting
AS $function$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Validate technician exists and has the correct role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_technician_id AND role = 'technician'
  ) THEN
    RAISE EXCEPTION 'Invalid technician ID or user is not a technician.';
  END IF;

  -- Get customer ID for notification
  SELECT customer_id INTO v_customer_id FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
      RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- Update booking with technician and set status to scheduled
  UPDATE public.bookings
  SET technician_id = p_technician_id,
      status = 'scheduled', -- Assume assigning means scheduling
      updated_at = timezone('utc', now())
  WHERE id = p_booking_id;

  -- Create Notifications
  BEGIN
      -- Notify the assigned technician
      PERFORM public.create_notification(
          p_user_id := p_technician_id,
          p_type := 'technician_assigned',  -- Use new, more specific type
          p_title := 'New Booking Assignment',
          p_message := 'You have been assigned a new booking (ID: ' || left(p_booking_id::text, 8) || ').',
          p_data := jsonb_build_object('booking_id', p_booking_id)
      );

      -- Notify the customer
      IF v_customer_id IS NOT NULL THEN
          PERFORM public.create_notification(
              p_user_id := v_customer_id,
              p_type := 'technician_assigned',  -- Use new, more specific type
              p_title := 'Technician Assigned',
              p_message := 'A technician has been assigned to your booking (ID: ' || left(p_booking_id::text, 8) || ').',
              p_data := jsonb_build_object('booking_id', p_booking_id, 'technician_id', p_technician_id)
          );
      END IF;

  EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create notification for technician assignment: %', SQLERRM;
      -- Continue with the assignment even if notification fails
  END;
END;
$function$;

----------------------------------------------------------------------
-- Function: get_dashboard_metrics
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
RETURNS json
LANGUAGE plpgsql
SET search_path = '' -- Added search_path setting
AS $function$
DECLARE
  total_bookings_count integer;
  completed_bookings_count integer;
  total_revenue numeric;
  customer_count integer;
  avg_rating numeric;
BEGIN
  -- Get total bookings count
  SELECT COUNT(*) INTO total_bookings_count FROM public.bookings;
  
  -- Get completed bookings count
  SELECT COUNT(*) INTO completed_bookings_count FROM public.bookings WHERE status = 'completed';
  
  -- Get total revenue
  SELECT COALESCE(SUM(price), 0) INTO total_revenue FROM public.bookings WHERE status = 'completed';
  
  -- Get customer count
  SELECT COUNT(*) INTO customer_count FROM public.profiles WHERE role = 'customer';
  
  -- Get average rating
  SELECT COALESCE(AVG(rating), 0) INTO avg_rating FROM public.reviews;
  
  RETURN json_build_object(
    'totalBookings', total_bookings_count,
    'completedBookings', completed_bookings_count,
    'totalRevenue', total_revenue,
    'customerCount', customer_count,
    'averageRating', avg_rating
  );
END;
$function$;

----------------------------------------------------------------------
-- Function: notify_status_change (Trigger Function)
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' -- Added search_path setting
AS $function$
DECLARE
  v_message TEXT;
  v_title TEXT;
  v_type TEXT;
  v_priority TEXT := 'normal';
  v_data JSONB := '{}'::jsonb;
  v_notify BOOLEAN := TRUE; -- Flag to determine if we should create a notification
BEGIN
  -- Set notification details based on new status
  CASE NEW.status::TEXT
    WHEN 'pending_payment' THEN
      v_title := 'Booking Created';
      v_message := 'Your booking is awaiting payment.';
      v_type := 'booking_created';
      -- For pending_payment, only notify if it's a new booking
      v_notify := (OLD.status IS NULL OR OLD.id IS NULL);
      
    WHEN 'payment_processing' THEN
      v_title := 'Payment Processing';
      v_message := 'Your payment is being processed.';
      v_type := 'payment_processing';
      -- Don't send a notification for this intermediate state
      v_notify := FALSE;
      
    WHEN 'payment_confirmed' THEN
      v_title := 'Payment Confirmed';
      v_message := 'Your payment has been confirmed.';
      v_type := 'payment_confirmed';
      v_priority := 'high';
      
    WHEN 'scheduled' THEN
      v_title := 'Booking Scheduled';
      v_message := 'Your booking has been scheduled.';
      v_type := 'booking_scheduled';
      
    WHEN 'in_progress' THEN
      v_title := 'Service In Progress';
      v_message := 'Your service is now in progress.';
      v_type := 'service_in_progress';
      
    WHEN 'completed' THEN
      v_title := 'Service Completed';
      v_message := 'Your service has been completed.';
      v_type := 'service_completed';
      v_priority := 'high';
      
    WHEN 'payment_failed' THEN
      v_title := 'Payment Failed';
      v_message := 'There was an issue with your payment.';
      v_type := 'payment_failed';
      v_priority := 'urgent';
      
    WHEN 'cancelled' THEN
      v_title := 'Booking Cancelled';
      v_message := 'Your booking has been cancelled.';
      v_type := 'booking_cancelled';
      
    WHEN 'rescheduled' THEN
      v_title := 'Booking Rescheduled';
      v_message := 'Your booking has been rescheduled.';
      v_type := 'booking_rescheduled';
      
    ELSE
      -- Default case (shouldn't happen with enum)
      v_title := 'Booking Update';
      v_message := 'Your booking status has been updated to ' || NEW.status::TEXT || '.';
      v_type := 'booking_updated';
  END CASE;
  
  -- Add booking metadata to notification
  v_data := jsonb_build_object(
    'booking_id', NEW.id,
    'old_status', COALESCE(OLD.status::TEXT, 'new'),
    'new_status', NEW.status::TEXT
  );
  
  -- Create notification if needed and customer exists
  IF v_notify = TRUE AND NEW.customer_id IS NOT NULL THEN
    BEGIN
      PERFORM public.create_notification(
        p_user_id := NEW.customer_id,
        p_type := v_type,
        p_title := v_title,
        p_message := v_message,
        p_data := v_data,
        p_priority := v_priority
      );
    EXCEPTION WHEN OTHERS THEN
      -- Don't let notification failure stop the trigger
      RAISE WARNING 'Failed to create notification for booking status change: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

----------------------------------------------------------------------
-- Function: update_booking_status_history (Trigger Function)
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_booking_status_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' -- Added search_path setting
AS $function$
DECLARE
  actor_id UUID;
  actor_type TEXT;
BEGIN
  -- Get the actor ID (user or system)
  IF auth.uid() IS NOT NULL THEN
    actor_id := auth.uid();
    actor_type := 'user';
  ELSE
    -- For system-initiated changes (webhooks, etc.)
    actor_id := NULL;
    actor_type := 'system';
  END IF;

  -- Only record history if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Update the status_history JSONB array
    NEW.status_history := COALESCE(OLD.status_history, '[]'::JSONB) || 
      jsonb_build_object(
        'status', NEW.status,
        'previous_status', OLD.status,
        'changed_at', CURRENT_TIMESTAMP,
        'actor_id', actor_id,
        'actor_type', actor_type,
        'metadata', jsonb_build_object(
          'payment_status', NEW.payment_status,
          'stripe_payment_intent_id', NEW.stripe_payment_intent_id
        )
      );
    
    -- Also update the status_updated_at timestamp
    NEW.status_updated_at := CURRENT_TIMESTAMP;
  END IF;
  
  RETURN NEW;
END;
$function$;

----------------------------------------------------------------------
-- Function: create_booking_status_notification
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_booking_status_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' -- Added search_path setting
AS $function$
DECLARE
  notification_needed BOOLEAN := FALSE;
  notification_title TEXT;
  notification_body TEXT;
  notification_type TEXT;
  notification_priority TEXT := 'normal';  -- changed from 'medium' to 'normal'
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Determine if this status change should trigger a notification
    CASE NEW.status
      WHEN 'payment_confirmed' THEN
        notification_needed := TRUE;
        notification_title := 'Payment Confirmed';
        notification_body := 'Your payment has been confirmed for booking #' || NEW.id;
        notification_type := 'payment_confirmation';
      WHEN 'scheduled' THEN
        notification_needed := TRUE;
        notification_title := 'Booking Scheduled';
        notification_body := 'Your service has been scheduled for ' || to_char(NEW.scheduled_date, 'Mon DD, YYYY');
        notification_type := 'booking_scheduled';
      WHEN 'in_progress' THEN
        notification_needed := TRUE;
        notification_title := 'Service In Progress';
        notification_body := 'Your service is now in progress';
        notification_type := 'service_update';
      WHEN 'completed' THEN
        notification_needed := TRUE;
        notification_title := 'Service Completed';
        notification_body := 'Your service has been completed';
        notification_type := 'service_update';
        notification_priority := 'high';
      WHEN 'payment_failed' THEN
        notification_needed := TRUE;
        notification_title := 'Payment Failed';
        notification_body := 'There was an issue with your payment for booking #' || NEW.id;
        notification_type := 'payment_issue';
        notification_priority := 'high';
      WHEN 'cancelled' THEN
        notification_needed := TRUE;
        notification_title := 'Booking Cancelled';
        notification_body := 'Your booking has been cancelled';
        notification_type := 'booking_update';
      ELSE
        notification_needed := FALSE;
    END CASE;
    
    -- Create the notification if needed
    IF notification_needed AND NEW.customer_id IS NOT NULL THEN
      PERFORM public.create_notification(
        NEW.customer_id,  -- user_id
        notification_type,  -- notification type
        notification_title,  -- title
        notification_body,  -- message
        jsonb_build_object(  -- data
          'booking_id', NEW.id,
          'old_status', OLD.status,
          'new_status', NEW.status
        ),
        notification_priority  -- priority
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

----------------------------------------------------------------------
-- Function: process_successful_payment
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_successful_payment(p_booking_id uuid, p_payment_intent_id text, p_amount numeric, p_payment_method text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' -- Added search_path setting
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_customer_id UUID;
  v_previous_status TEXT;
  v_result JSONB;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', format('Booking not found: %s', p_booking_id)
    );
  END IF;
  
  -- Store current status for logging/notification
  v_customer_id := v_booking.customer_id;
  v_previous_status := v_booking.status;
  
  BEGIN 
    -- Only update if the booking is in a valid state for payment confirmation
    -- Valid states: pending_payment, payment_processing, payment_failed
    -- (we allow payment_failed to handle retry scenarios)
    IF v_booking.status IN ('pending_payment', 'payment_processing', 'payment_failed') THEN
      -- Update booking
      UPDATE public.bookings
      SET 
        status = 'payment_confirmed',
        payment_status = 'paid',
        stripe_payment_intent_id = p_payment_intent_id,
        notes = COALESCE(notes, '') || E'\nPayment processed successfully. Payment Intent: ' || p_payment_intent_id
      WHERE id = p_booking_id;
      
      -- Insert payment record
      INSERT INTO public.payments (
        user_id,
        booking_id,
        stripe_payment_id,
        amount,
        status,
        payment_method,
        created_at
      ) VALUES (
        v_customer_id,
        p_booking_id,
        p_payment_intent_id,
        p_amount,
        'succeeded',
        p_payment_method,
        NOW()
      );
      
      v_result := jsonb_build_object(
        'success', true,
        'message', 'Payment processed successfully',
        'booking_id', p_booking_id,
        'previous_status', v_previous_status,
        'new_status', 'payment_confirmed'
      );
    ELSE
      -- If the booking is already in a final state, don't update but record the attempt
      v_result := jsonb_build_object(
        'success', false,
        'message', format('Booking %s is in state %s which cannot transition to payment_confirmed', 
                        p_booking_id, v_booking.status),
        'booking_id', p_booking_id,
        'status', v_booking.status
      );
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Return error information
      v_result := jsonb_build_object(
        'success', false,
        'message', 'Error processing payment',
        'error', SQLERRM,
        'booking_id', p_booking_id
      );
  END;
  
  RETURN v_result;
END;
$function$;

----------------------------------------------------------------------
-- Function: process_failed_payment
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_failed_payment(p_booking_id uuid, p_payment_intent_id text, p_failure_message text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' -- Added search_path setting
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_customer_id UUID;
  v_previous_status TEXT;
  v_result JSONB;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', format('Booking not found: %s', p_booking_id)
    );
  END IF;
  
  -- Store current status for logging/notification
  v_customer_id := v_booking.customer_id;
  v_previous_status := v_booking.status;
  
  BEGIN 
    -- Only update if the booking is in a valid state for payment failed
    -- Valid states: pending_payment, payment_processing
    -- (we allow payment_processing to handle retry scenarios)
    IF v_booking.status IN ('pending_payment', 'payment_processing') THEN
      -- Update booking
      UPDATE public.bookings
      SET 
        status = 'payment_failed',
        payment_status = 'failed',
        stripe_payment_intent_id = p_payment_intent_id,
        notes = COALESCE(notes, '') || E'\nPayment failed. Payment Intent: ' || p_payment_intent_id || 
                E'\nMessage: ' || p_failure_message
      WHERE id = p_booking_id;
      
      -- Insert payment record
      INSERT INTO public.payments (
        user_id,
        booking_id,
        stripe_payment_id,
        amount,
        status,
        payment_method,
        error_message,
        created_at
      ) VALUES (
        v_customer_id,
        p_booking_id,
        p_payment_intent_id,
        v_booking.price, -- Use the booking price
        'failed',
        NULL, -- We may not have payment method for failed payments
        p_failure_message,
        NOW()
      );
      
      v_result := jsonb_build_object(
        'success', true,
        'message', 'Payment failure recorded',
        'booking_id', p_booking_id,
        'previous_status', v_previous_status,
        'new_status', 'payment_failed'
      );
    ELSE
      -- If the booking is already in a final state, don't update but record the attempt
      v_result := jsonb_build_object(
        'success', false,
        'message', format('Booking %s is in state %s which cannot transition to payment_failed', 
                        p_booking_id, v_booking.status),
        'booking_id', p_booking_id,
        'status', v_booking.status
      );
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Return error information
      v_result := jsonb_build_object(
        'success', false,
        'message', 'Error recording payment failure',
        'error', SQLERRM,
        'booking_id', p_booking_id
      );
  END;
  
  RETURN v_result;
END;
$function$;

----------------------------------------------------------------------
-- Function: notify_on_booking_change (Trigger Function)
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_booking_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = '' -- Added search_path setting
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
  PERFORM public.create_notification(
    NEW.customer_id, 
    v_type, 
    v_title, 
    v_message, 
    v_data
  );

  -- If there's a technician assigned, notify them too
  IF NEW.technician_id IS NOT NULL THEN
    PERFORM public.create_notification(
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

----------------------------------------------------------------------
-- Function: update_booking_status
----------------------------------------------------------------------
-- Drop the old function with the correct signature (uuid, text, uuid) 
-- to avoid signature/return type conflict
DROP FUNCTION IF EXISTS public.update_booking_status(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.update_booking_status(p_booking_id uuid, p_new_status text, p_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' -- Added search_path setting
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_current_status TEXT;
  v_customer_id UUID;
  v_technician_id UUID;
  v_notification_title TEXT;
  v_notification_message TEXT;
  v_notification_type TEXT := 'booking_updated';
  v_success BOOLEAN;
BEGIN
  -- Get current booking details
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found with ID: %', p_booking_id;
  END IF;

  -- Store current values
  v_current_status := v_booking.status;
  v_customer_id := v_booking.customer_id;
  v_technician_id := v_booking.technician_id;

  -- Validate status transition (simplified)
  -- This could be expanded with a more detailed state machine
  IF p_new_status = v_current_status THEN
    RETURN false;
  END IF;

  -- Basic status validation (can be expanded)
  IF v_current_status = 'cancelled' AND p_new_status != 'cancelled' THEN
    RAISE EXCEPTION 'Cannot change a cancelled booking to %', p_new_status;
  END IF;

  -- More restrictive transitions based on user role (if user is provided)
  IF p_user_id IS NOT NULL THEN
    -- Check if it's an admin changing status
    IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', v_current_status, p_new_status;
     END IF;
  END IF;

  -- Update the booking status
  UPDATE public.bookings
  SET status = p_new_status,
      updated_at = timezone('utc', now())
  WHERE id = p_booking_id;

  GET DIAGNOSTICS v_success = ROW_COUNT;

  -- Create Notification(s)
  BEGIN
    -- Determine who to notify and the message content
    v_notification_title := 'Booking Status Updated';
    v_notification_message := 'The status of your booking (ID: ' || left(p_booking_id::text, 8) || ') has been updated to ' || p_new_status || '.';
    v_notification_type := 'booking_updated';

    -- Notify customer (usually always)
    IF v_customer_id IS NOT NULL THEN
        PERFORM public.create_notification(
            p_user_id := v_customer_id,
            p_type := v_notification_type,
            p_title := v_notification_title,
            p_message := v_notification_message,
            p_data := jsonb_build_object('booking_id', p_booking_id, 'new_status', p_new_status)
        );
    END IF;

    -- Notify technician if assigned and status changes to relevant states
    IF v_technician_id IS NOT NULL AND p_new_status IN ('in_progress', 'completed', 'cancelled', 'rescheduled') THEN
         PERFORM public.create_notification(
            p_user_id := v_technician_id,
            p_type := v_notification_type,
            p_title := v_notification_title,
            p_message := 'The status of your assigned booking (ID: ' || left(p_booking_id::text, 8) || ') is now ' || p_new_status || '.',
            p_data := jsonb_build_object('booking_id', p_booking_id, 'new_status', p_new_status)
        );
    END IF;

  EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create notification for booking status update (%): %', p_booking_id, SQLERRM;
      -- Do not block the main operation if notification fails
  END;

  RETURN v_success > 0;
END;
$function$;

----------------------------------------------------------------------
-- Function: test_assign_booking_error
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.test_assign_booking_error()
RETURNS text
LANGUAGE plpgsql
SET search_path = '' -- Added search_path setting
AS $function$
DECLARE
    v_error TEXT;
    v_booking_id UUID;
    v_technician_id UUID;
BEGIN
    -- Get a valid booking and technician ID
    SELECT id INTO v_booking_id FROM public.bookings WHERE status = 'payment_confirmed' LIMIT 1;
    SELECT id INTO v_technician_id FROM public.profiles WHERE role = 'technician' LIMIT 1;
    
    IF v_booking_id IS NULL OR v_technician_id IS NULL THEN
        RETURN 'No valid booking or technician found for testing';
    END IF;
    
    BEGIN
        -- Call the function
        PERFORM public.assign_booking_technician(v_booking_id, v_technician_id);
    EXCEPTION WHEN OTHERS THEN
        v_error := SQLERRM;
        -- Log the error
        INSERT INTO public.temp_function_log (function_name, error_message)
        VALUES ('assign_booking_technician', v_error);
    END;
    
    RETURN v_error;
END;
$function$;
