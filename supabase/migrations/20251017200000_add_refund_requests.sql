-- Create refund_requests table
CREATE TABLE IF NOT EXISTS public.refund_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    payment_intent_id TEXT NOT NULL,
    requested_amount NUMERIC(10, 2) NOT NULL CHECK (requested_amount > 0),
    approved_amount NUMERIC(10, 2) CHECK (approved_amount > 0),
    reason TEXT NOT NULL CHECK (char_length(reason) >= 20),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.profiles(id),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT one_request_per_booking UNIQUE (booking_id)
);

-- Add indexes for performance
CREATE INDEX idx_refund_requests_booking_id ON public.refund_requests(booking_id);
CREATE INDEX idx_refund_requests_customer_id ON public.refund_requests(customer_id);
CREATE INDEX idx_refund_requests_status ON public.refund_requests(status);
CREATE INDEX idx_refund_requests_requested_at ON public.refund_requests(requested_at DESC);

-- Enable Row Level Security
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Customers can view their own refund requests
CREATE POLICY "Customers can view own refund requests"
ON public.refund_requests
FOR SELECT
TO authenticated
USING (
    customer_id = auth.uid()
);

-- Admins can view all refund requests
CREATE POLICY "Admins can view all refund requests"
ON public.refund_requests
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Customers can create refund requests for their own bookings
CREATE POLICY "Customers can create refund requests"
ON public.refund_requests
FOR INSERT
TO authenticated
WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.bookings
        WHERE bookings.id = booking_id
        AND bookings.customer_id = auth.uid()
    )
);

-- Only admins can update refund requests
CREATE POLICY "Admins can update refund requests"
ON public.refund_requests
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- RPC Function: Check refund eligibility
CREATE OR REPLACE FUNCTION public.check_refund_eligibility(p_booking_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_booking RECORD;
    v_existing_request RECORD;
    v_days_since_completion INTEGER;
    v_result JSON;
BEGIN
    -- Get booking details
    SELECT
        b.*,
        b.scheduled_date + b.scheduled_time::time AS service_datetime
    INTO v_booking
    FROM bookings b
    WHERE b.id = p_booking_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'eligible', false,
            'reason', 'Booking not found'
        );
    END IF;

    -- Check if customer owns this booking
    IF v_booking.customer_id != auth.uid() THEN
        RETURN json_build_object(
            'eligible', false,
            'reason', 'You do not have permission to request a refund for this booking'
        );
    END IF;

    -- Check if booking has a payment intent
    IF v_booking.stripe_payment_intent_id IS NULL THEN
        RETURN json_build_object(
            'eligible', false,
            'reason', 'This booking has no payment to refund'
        );
    END IF;

    -- Check if booking status is refund-eligible
    IF v_booking.status NOT IN ('completed', 'payment_confirmed', 'scheduled', 'in_progress') THEN
        RETURN json_build_object(
            'eligible', false,
            'reason', 'This booking status (' || v_booking.status || ') is not eligible for refund'
        );
    END IF;

    -- Check for existing refund request
    SELECT * INTO v_existing_request
    FROM refund_requests
    WHERE booking_id = p_booking_id;

    IF FOUND THEN
        RETURN json_build_object(
            'eligible', false,
            'reason', 'A refund request already exists for this booking (Status: ' || v_existing_request.status || ')'
        );
    END IF;

    -- Check 14-day limit for completed bookings
    IF v_booking.status = 'completed' THEN
        v_days_since_completion := EXTRACT(DAY FROM (NOW() - v_booking.service_datetime));

        IF v_days_since_completion > 14 THEN
            RETURN json_build_object(
                'eligible', false,
                'reason', 'Refund requests must be submitted within 14 days of service completion'
            );
        END IF;
    END IF;

    -- All checks passed
    RETURN json_build_object(
        'eligible', true,
        'reason', NULL
    );
END;
$$;

-- RPC Function: Create refund request
CREATE OR REPLACE FUNCTION public.create_refund_request(
    p_booking_id UUID,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_booking RECORD;
    v_eligibility JSON;
    v_request_id UUID;
    v_admin_id UUID;
BEGIN
    -- Check eligibility
    v_eligibility := public.check_refund_eligibility(p_booking_id);

    IF NOT (v_eligibility->>'eligible')::BOOLEAN THEN
        RAISE EXCEPTION 'Not eligible for refund: %', v_eligibility->>'reason';
    END IF;

    -- Get booking details
    SELECT * INTO v_booking
    FROM bookings
    WHERE id = p_booking_id;

    -- Create refund request
    INSERT INTO refund_requests (
        booking_id,
        customer_id,
        payment_intent_id,
        requested_amount,
        reason
    ) VALUES (
        p_booking_id,
        auth.uid(),
        v_booking.stripe_payment_intent_id,
        v_booking.price,
        p_reason
    )
    RETURNING id INTO v_request_id;

    -- Notify all admins
    FOR v_admin_id IN
        SELECT id FROM profiles WHERE role = 'admin'
    LOOP
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            data
        ) VALUES (
            v_admin_id,
            'refund_requested',
            'New Refund Request',
            'A customer has requested a refund for booking #' || SUBSTRING(p_booking_id::TEXT, 1, 8),
            json_build_object(
                'booking_id', p_booking_id,
                'refund_request_id', v_request_id,
                'amount', v_booking.price
            )::jsonb
        );
    END LOOP;

    RETURN v_request_id;
END;
$$;

-- RPC Function: Approve refund request
CREATE OR REPLACE FUNCTION public.approve_refund_request(
    p_request_id UUID,
    p_approved_amount NUMERIC,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_request RECORD;
    v_admin_role TEXT;
BEGIN
    -- Check if user is admin
    SELECT role INTO v_admin_role
    FROM profiles
    WHERE id = auth.uid();

    IF v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can approve refund requests';
    END IF;

    -- Get refund request details
    SELECT * INTO v_request
    FROM refund_requests
    WHERE id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Refund request not found';
    END IF;

    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Refund request is not pending (current status: %)', v_request.status;
    END IF;

    IF p_approved_amount <= 0 OR p_approved_amount > v_request.requested_amount THEN
        RAISE EXCEPTION 'Invalid approved amount';
    END IF;

    -- Update refund request
    UPDATE refund_requests
    SET
        status = 'approved',
        approved_amount = p_approved_amount,
        admin_notes = p_admin_notes,
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id;

    -- Notify customer
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
    ) VALUES (
        v_request.customer_id,
        'refund_approved',
        'Refund Request Approved',
        'Your refund request has been approved for $' || p_approved_amount::TEXT,
        json_build_object(
            'booking_id', v_request.booking_id,
            'refund_request_id', p_request_id,
            'approved_amount', p_approved_amount,
            'admin_notes', p_admin_notes
        )::jsonb
    );

    RETURN TRUE;
END;
$$;

-- RPC Function: Reject refund request
CREATE OR REPLACE FUNCTION public.reject_refund_request(
    p_request_id UUID,
    p_admin_notes TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_request RECORD;
    v_admin_role TEXT;
BEGIN
    -- Check if user is admin
    SELECT role INTO v_admin_role
    FROM profiles
    WHERE id = auth.uid();

    IF v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can reject refund requests';
    END IF;

    -- Require admin notes for rejection
    IF p_admin_notes IS NULL OR char_length(p_admin_notes) < 10 THEN
        RAISE EXCEPTION 'Admin notes are required when rejecting a refund request (minimum 10 characters)';
    END IF;

    -- Get refund request details
    SELECT * INTO v_request
    FROM refund_requests
    WHERE id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Refund request not found';
    END IF;

    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Refund request is not pending (current status: %)', v_request.status;
    END IF;

    -- Update refund request
    UPDATE refund_requests
    SET
        status = 'rejected',
        admin_notes = p_admin_notes,
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id;

    -- Notify customer
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
    ) VALUES (
        v_request.customer_id,
        'refund_rejected',
        'Refund Request Denied',
        'Your refund request has been denied. ' || p_admin_notes,
        json_build_object(
            'booking_id', v_request.booking_id,
            'refund_request_id', p_request_id,
            'admin_notes', p_admin_notes
        )::jsonb
    );

    RETURN TRUE;
END;
$$;

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION public.check_refund_eligibility TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_refund_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_refund_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_refund_request TO authenticated;
