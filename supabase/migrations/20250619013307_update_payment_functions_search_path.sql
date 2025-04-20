-- Migration: Fix search_path for payment functions
-- Ensures both process_successful_payment and process_failed_payment use SET search_path = 'pg_catalog', 'public'

CREATE OR REPLACE FUNCTION public.process_successful_payment(
  p_booking_id uuid,
  p_payment_intent_id text,
  p_amount numeric,
  p_payment_method text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.process_failed_payment(
  p_booking_id uuid,
  p_payment_intent_id text,
  p_failure_message text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
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
        'message', 'Error processing payment failure',
        'error', SQLERRM,
        'booking_id', p_booking_id
      );
  END;
  
  RETURN v_result;
END;
$$;
