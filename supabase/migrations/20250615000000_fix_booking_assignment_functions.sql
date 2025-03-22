-- Migration to ensure all booking-related functions have proper security
-- Date: 2025-06-15

-- Helper function to check if a booking exists and get customer/technician IDs
CREATE OR REPLACE FUNCTION public.get_booking_participants(booking_id uuid)
 RETURNS TABLE(customer_id uuid, technician_id uuid, service_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'pg_catalog', 'public'
AS $function$
BEGIN
  RETURN QUERY 
  SELECT 
    b.customer_id,
    b.technician_id,
    b.service_id
  FROM 
    bookings b
  WHERE 
    b.id = booking_id;
END;
$function$;

COMMENT ON FUNCTION public.get_booking_participants IS 'Securely retrieves participant IDs from a booking';

-- Function to assign a technician to a booking
CREATE OR REPLACE FUNCTION public.assign_booking_technician(p_booking_id uuid, p_technician_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'pg_catalog', 'public'
AS $function$
DECLARE
  v_success BOOLEAN;
  v_user_role TEXT;
BEGIN
  -- Check if user is admin
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
  
  IF v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can assign technicians to bookings';
  END IF;
  
  -- Verify technician exists and has technician role
  PERFORM 1 FROM profiles WHERE id = p_technician_id AND role = 'technician';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid technician ID or user is not a technician';
  END IF;
  
  -- Update booking with technician and change status to scheduled
  UPDATE bookings 
  SET 
    technician_id = p_technician_id,
    status = CASE WHEN status = 'pending' THEN 'scheduled' ELSE status END,
    updated_at = NOW()
  WHERE id = p_booking_id;
  
  GET DIAGNOSTICS v_success = ROW_COUNT;
  RETURN v_success > 0;
END;
$function$;

COMMENT ON FUNCTION public.assign_booking_technician IS 'Assigns a technician to a booking (admin only)';

-- Function to update booking status
CREATE OR REPLACE FUNCTION public.update_booking_status(p_booking_id uuid, p_status text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'pg_catalog', 'public'
AS $function$
DECLARE
  v_success BOOLEAN;
  v_user_role TEXT;
  v_customer_id UUID;
  v_technician_id UUID;
BEGIN
  -- Get booking information
  SELECT b.customer_id, b.technician_id 
  INTO v_customer_id, v_technician_id
  FROM bookings b
  WHERE b.id = p_booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  -- Check user permissions based on role
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
  
  IF v_user_role = 'admin' THEN
    -- Admins can update any booking
    NULL;
  ELSIF v_user_role = 'technician' AND v_technician_id = auth.uid() THEN
    -- Technicians can only update their assigned bookings
    -- and can only set status to 'in_progress', 'completed' or 'cancelled'
    IF p_status NOT IN ('in_progress', 'completed', 'cancelled') THEN
      RAISE EXCEPTION 'Technicians can only set status to in_progress, completed or cancelled';
    END IF;
  ELSIF v_user_role = 'customer' AND v_customer_id = auth.uid() THEN
    -- Customers can only update their own bookings
    -- and can only set status to 'cancelled'
    IF p_status != 'cancelled' THEN
      RAISE EXCEPTION 'Customers can only cancel their bookings';
    END IF;
  ELSE
    RAISE EXCEPTION 'You do not have permission to update this booking';
  END IF;
  
  -- Update booking status
  UPDATE bookings 
  SET 
    status = p_status,
    updated_at = NOW()
  WHERE id = p_booking_id;
  
  GET DIAGNOSTICS v_success = ROW_COUNT;
  RETURN v_success > 0;
END;
$function$;

COMMENT ON FUNCTION public.update_booking_status IS 'Updates booking status with role-based permissions'; 