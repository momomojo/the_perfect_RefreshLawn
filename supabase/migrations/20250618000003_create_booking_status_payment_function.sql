-- Migration: Add function to update booking status based on payment intent ID

-- Add a new function to update booking status for payment intents
CREATE OR REPLACE FUNCTION update_booking_status_for_payment(
  payment_intent_id TEXT,
  new_status public.booking_status
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
DECLARE
  v_booking_id UUID;
  v_success BOOLEAN;
BEGIN
  -- Find the booking associated with this payment intent
  SELECT id INTO v_booking_id
  FROM bookings
  WHERE stripe_payment_intent_id = payment_intent_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'No booking found for payment intent: %', payment_intent_id;
    RETURN FALSE;
  END IF;
  
  -- Update the booking status
  UPDATE bookings
  SET 
    status = new_status,
    updated_at = NOW()
  WHERE id = v_booking_id;
  
  GET DIAGNOSTICS v_success = ROW_COUNT;
  
  IF v_success THEN
    RAISE NOTICE 'Successfully updated booking % status to %', v_booking_id, new_status;
  END IF;
  
  RETURN v_success;
END;
$$;

COMMENT ON FUNCTION update_booking_status_for_payment IS 'Updates booking status based on a payment intent ID'; 