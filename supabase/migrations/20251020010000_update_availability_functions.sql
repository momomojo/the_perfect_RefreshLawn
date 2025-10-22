-- Update scheduling functions to respect the "Available Now" toggle

-- ============================================================================
-- UPDATE: get_available_time_slots - Check active booking status
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_available_time_slots(
  p_service_id uuid,
  p_date date,
  p_slot_interval_minutes integer DEFAULT 30
)
RETURNS TABLE (
  time_slot time,
  available_technician_ids uuid[],
  available_technician_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_duration integer;
  v_day_of_week integer;
  v_current_time time;
  v_slot_end time;
  v_start_datetime timestamptz;
  v_end_datetime timestamptz;
  v_available_techs uuid[];
BEGIN
  -- Get service duration
  SELECT default_duration_minutes INTO v_service_duration
  FROM public.services
  WHERE id = p_service_id;

  IF v_service_duration IS NULL THEN
    RAISE EXCEPTION 'Service not found: %', p_service_id;
  END IF;

  -- Get day of week for the requested date
  v_day_of_week := EXTRACT(DOW FROM p_date)::integer;

  -- Generate time slots from 7 AM to 7 PM in the specified interval
  FOR v_current_time IN
    SELECT generate_series(
      '07:00:00'::time,
      '19:00:00'::time,
      (p_slot_interval_minutes || ' minutes')::interval
    )::time
  LOOP
    -- Calculate slot end time
    v_slot_end := (v_current_time::interval + (v_service_duration || ' minutes')::interval)::time;

    -- Skip if slot end time goes past 9 PM
    IF v_slot_end > '21:00:00'::time THEN
      CONTINUE;
    END IF;

    -- Convert to full timestamps for conflict checking
    v_start_datetime := (p_date || ' ' || v_current_time)::timestamptz;
    v_end_datetime := (p_date || ' ' || v_slot_end)::timestamptz;

    -- Find all technicians available for this slot
    SELECT ARRAY_AGG(p.id)
    INTO v_available_techs
    FROM public.profiles p
    WHERE p.role = 'technician'
      AND p.is_actively_accepting_bookings = true  -- NEW: Check active status
      -- Check if technician has availability for this day/time
      AND EXISTS (
        SELECT 1
        FROM public.technician_availability ta
        WHERE ta.technician_id = p.id
          AND ta.day_of_week = v_day_of_week
          AND ta.is_active = true
          AND ta.start_time <= v_current_time
          AND ta.end_time >= v_slot_end
      )
      -- Check for no conflicts
      AND NOT public.check_technician_conflict(
        p.id,
        v_start_datetime,
        v_end_datetime,
        NULL
      );

    -- Only return slots that have at least one available technician
    IF v_available_techs IS NOT NULL AND array_length(v_available_techs, 1) > 0 THEN
      time_slot := v_current_time;
      available_technician_ids := v_available_techs;
      available_technician_count := array_length(v_available_techs, 1);
      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.get_available_time_slots IS 'Returns all available time slots for a service on a specific date, filtering for actively accepting technicians';

-- ============================================================================
-- UPDATE: get_available_dates_for_service - Check active booking status
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_available_dates_for_service(
  p_service_id uuid,
  p_year integer,
  p_month integer
)
RETURNS TABLE (
  available_date date,
  technician_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date date;
  v_end_date date;
  v_current_date date;
  v_day_of_week integer;
  v_tech_count integer;
BEGIN
  -- Calculate month boundaries
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + interval '1 month' - interval '1 day')::date;

  -- Iterate through each date in the month
  FOR v_current_date IN
    SELECT generate_series(v_start_date, v_end_date, '1 day'::interval)::date
  LOOP
    -- Skip dates in the past
    IF v_current_date < CURRENT_DATE THEN
      CONTINUE;
    END IF;

    v_day_of_week := EXTRACT(DOW FROM v_current_date)::integer;

    -- Count how many technicians have availability for this day
    SELECT COUNT(DISTINCT p.id) INTO v_tech_count
    FROM public.profiles p
    WHERE p.role = 'technician'
      AND p.is_actively_accepting_bookings = true  -- NEW: Check active status
      AND EXISTS (
        SELECT 1
        FROM public.technician_availability ta
        WHERE ta.technician_id = p.id
          AND ta.day_of_week = v_day_of_week
          AND ta.is_active = true
      );

    -- Only return dates where at least one technician is available
    IF v_tech_count > 0 THEN
      available_date := v_current_date;
      technician_count := v_tech_count;
      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.get_available_dates_for_service IS 'Returns all dates in a month where at least one actively accepting technician has availability';

-- ============================================================================
-- UPDATE: auto_assign_technician - Check active booking status
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_assign_technician(
  p_booking_id uuid,
  p_scheduled_date date,
  p_scheduled_time time,
  p_duration_minutes integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_datetime timestamptz;
  v_end_datetime timestamptz;
  v_selected_technician_id uuid;
  v_day_of_week integer;
BEGIN
  -- Calculate full datetime range
  v_start_datetime := (p_scheduled_date || ' ' || p_scheduled_time)::timestamptz;
  v_end_datetime := v_start_datetime + (p_duration_minutes || ' minutes')::interval;
  v_day_of_week := EXTRACT(DOW FROM p_scheduled_date)::integer;

  -- Find available technicians using round-robin (least recently assigned first)
  SELECT p.id INTO v_selected_technician_id
  FROM public.profiles p
  LEFT JOIN public.technician_assignment_tracking tat ON tat.technician_id = p.id
  WHERE p.role = 'technician'
    AND p.is_actively_accepting_bookings = true  -- NEW: Check active status
    -- Check availability for this day/time
    AND EXISTS (
      SELECT 1
      FROM public.technician_availability ta
      WHERE ta.technician_id = p.id
        AND ta.day_of_week = v_day_of_week
        AND ta.is_active = true
        AND ta.start_time <= p_scheduled_time
        AND ta.end_time >= (v_start_datetime + (p_duration_minutes || ' minutes')::interval)::time
    )
    -- Check for no conflicts
    AND NOT public.check_technician_conflict(
      p.id,
      v_start_datetime,
      v_end_datetime,
      NULL
    )
  ORDER BY
    COALESCE(tat.last_assigned_at, '1970-01-01'::timestamptz) ASC,  -- Least recently assigned first
    tat.total_assignments ASC NULLS FIRST                            -- Then by fewest total assignments
  LIMIT 1;

  -- If no technician found, return NULL
  IF v_selected_technician_id IS NULL THEN
    RAISE NOTICE 'No available technician found for booking %', p_booking_id;
    RETURN NULL;
  END IF;

  -- Update the booking with assigned technician
  UPDATE public.bookings
  SET
    technician_id = v_selected_technician_id,
    status = 'scheduled',
    duration_minutes = p_duration_minutes  -- Ensure duration is set
  WHERE id = p_booking_id;

  -- Update assignment tracking
  INSERT INTO public.technician_assignment_tracking (technician_id, last_assigned_at, total_assignments)
  VALUES (v_selected_technician_id, now(), 1)
  ON CONFLICT (technician_id)
  DO UPDATE SET
    last_assigned_at = now(),
    total_assignments = public.technician_assignment_tracking.total_assignments + 1;

  -- Create notifications (using existing notification function)
  -- Notify technician
  PERFORM public.create_notification_safe(
    v_selected_technician_id,
    'booking_assigned',
    'New Booking Assignment',
    'You have been assigned to a new booking',
    jsonb_build_object('booking_id', p_booking_id)
  );

  -- Notify customer
  PERFORM public.create_notification_safe(
    (SELECT customer_id FROM public.bookings WHERE id = p_booking_id),
    'technician_assigned',
    'Technician Assigned',
    'A technician has been assigned to your booking',
    jsonb_build_object('booking_id', p_booking_id, 'technician_id', v_selected_technician_id)
  );

  RETURN v_selected_technician_id;
END;
$$;

COMMENT ON FUNCTION public.auto_assign_technician IS 'Automatically assigns an actively accepting technician to a booking using round-robin distribution';
