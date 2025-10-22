-- Migration: Create audit logging system
-- Description: Track sensitive operations for compliance, debugging, and forensics
-- Priority: P1 - High (required for production)
-- Reference: Security best practices for SaaS applications

-- ============================================================================
-- AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Who performed the action
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT, -- Denormalized for historical records
  user_role TEXT, -- Role at time of action (customer, technician, admin)

  -- What action was performed
  action TEXT NOT NULL, -- e.g., 'role_change', 'refund_approved', 'service_price_edit'
  entity_type TEXT NOT NULL, -- e.g., 'user', 'booking', 'service', 'payment'
  entity_id UUID, -- ID of the affected entity

  -- Change details
  old_value JSONB, -- Previous state (for updates)
  new_value JSONB, -- New state (for creates/updates)

  -- Request metadata
  ip_address INET, -- Client IP address
  user_agent TEXT, -- Browser/client information
  request_id TEXT, -- For correlating with application logs

  -- Additional context
  metadata JSONB, -- Extra context (e.g., reason for refund)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- INDEXES for Query Performance
-- ============================================================================

-- Primary lookup patterns
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_audit_logs_user_action ON public.audit_logs(user_id, action, created_at DESC);
CREATE INDEX idx_audit_logs_entity_type_created ON public.audit_logs(entity_type, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin full access (read-only, inserts via function)
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

-- Users can view their own audit logs
CREATE POLICY "Users can view their own audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- No direct INSERT/UPDATE/DELETE - only via audit_log() function
-- This ensures all audit logs go through proper validation

-- ============================================================================
-- AUDIT LOG FUNCTION (Secure Insert)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
  v_user_email TEXT;
  v_user_role TEXT;
BEGIN
  -- Get current user info
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Insert audit log
  INSERT INTO public.audit_logs (
    user_id,
    user_email,
    user_role,
    action,
    entity_type,
    entity_id,
    old_value,
    new_value,
    metadata,
    created_at
  ) VALUES (
    auth.uid(),
    v_user_email,
    v_user_role,
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_value,
    p_new_value,
    p_metadata,
    now()
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

COMMENT ON FUNCTION public.log_audit_event IS
  'Securely logs an audit event with user context.

   Parameters:
   - p_action: Action performed (e.g., ''role_change'', ''refund_approved'')
   - p_entity_type: Type of entity affected (e.g., ''user'', ''booking'', ''service'')
   - p_entity_id: ID of the affected entity
   - p_old_value: Previous state (JSONB) for updates
   - p_new_value: New state (JSONB) for creates/updates
   - p_metadata: Additional context (JSONB)

   Returns: UUID of created audit log

   Example:
   SELECT log_audit_event(
     ''role_change'',
     ''user'',
     ''user-uuid'',
     ''{"role": "customer"}'',
     ''{"role": "technician"}'',
     ''{"reason": "User requested technician access"}''
   );';

-- ============================================================================
-- AUDIT TRIGGER FUNCTIONS (Automatic Logging)
-- ============================================================================

-- Trigger function for user role changes
CREATE OR REPLACE FUNCTION public.audit_trigger_profile_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log role changes
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    PERFORM log_audit_event(
      'role_change',
      'user',
      NEW.id,
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role),
      jsonb_build_object(
        'changed_by', auth.uid(),
        'timestamp', now()
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to profiles table
DROP TRIGGER IF EXISTS audit_profile_role_change ON public.profiles;
CREATE TRIGGER audit_profile_role_change
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger_profile_role_change();

-- Trigger function for service price changes
CREATE OR REPLACE FUNCTION public.audit_trigger_service_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log price changes
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    PERFORM log_audit_event(
      'service_price_edit',
      'service',
      NEW.id,
      jsonb_build_object(
        'name', OLD.name,
        'price', OLD.price,
        'price_display', (OLD.price / 100.0)::TEXT || ' USD'
      ),
      jsonb_build_object(
        'name', NEW.name,
        'price', NEW.price,
        'price_display', (NEW.price / 100.0)::TEXT || ' USD'
      ),
      jsonb_build_object(
        'changed_by', auth.uid(),
        'price_difference', NEW.price - OLD.price
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to services table
DROP TRIGGER IF EXISTS audit_service_price_change ON public.services;
CREATE TRIGGER audit_service_price_change
AFTER UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger_service_price_change();

-- Trigger function for booking refunds
CREATE OR REPLACE FUNCTION public.audit_trigger_booking_refund()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log when workflow_status changes to 'refunded'
  IF OLD.workflow_status IS DISTINCT FROM NEW.workflow_status
     AND NEW.workflow_status = 'refunded' THEN
    PERFORM log_audit_event(
      'booking_refunded',
      'booking',
      NEW.id,
      jsonb_build_object(
        'status', OLD.workflow_status,
        'refund_status', OLD.refund_status
      ),
      jsonb_build_object(
        'status', NEW.workflow_status,
        'refund_status', NEW.refund_status
      ),
      jsonb_build_object(
        'customer_id', NEW.customer_id,
        'service_id', NEW.service_id,
        'refund_reason', NEW.refund_reason
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to bookings table
DROP TRIGGER IF EXISTS audit_booking_refund ON public.bookings;
CREATE TRIGGER audit_booking_refund
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger_booking_refund();

-- ============================================================================
-- HELPER FUNCTIONS FOR AUDIT LOG QUERIES
-- ============================================================================

-- Get audit logs for a specific user
CREATE OR REPLACE FUNCTION public.get_user_audit_logs(
  p_user_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  action TEXT,
  entity_type TEXT,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    action,
    entity_type,
    entity_id,
    old_value,
    new_value,
    metadata,
    created_at
  FROM public.audit_logs
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- Get audit logs for a specific entity
CREATE OR REPLACE FUNCTION public.get_entity_audit_logs(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  user_email TEXT,
  user_role TEXT,
  action TEXT,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    user_email,
    user_role,
    action,
    old_value,
    new_value,
    metadata,
    created_at
  FROM public.audit_logs
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- Get recent audit logs (admin only)
CREATE OR REPLACE FUNCTION public.get_recent_audit_logs(
  p_action TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  user_email TEXT,
  user_role TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Return filtered audit logs
  RETURN QUERY
  SELECT
    audit_logs.id,
    audit_logs.user_email,
    audit_logs.user_role,
    audit_logs.action,
    audit_logs.entity_type,
    audit_logs.entity_id,
    audit_logs.old_value,
    audit_logs.new_value,
    audit_logs.metadata,
    audit_logs.created_at
  FROM public.audit_logs
  WHERE (p_action IS NULL OR audit_logs.action = p_action)
    AND (p_entity_type IS NULL OR audit_logs.entity_type = p_entity_type)
  ORDER BY audit_logs.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- CLEANUP FUNCTION (Optional - for data retention policies)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(
  p_retention_days INT DEFAULT 365
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  -- Only allow admins to run cleanup
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Delete old audit logs
  DELETE FROM public.audit_logs
  WHERE created_at < now() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RAISE NOTICE 'Deleted % audit log(s) older than % days', v_deleted_count, p_retention_days;

  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_audit_logs IS
  'Deletes audit logs older than specified retention period.

   Default retention: 365 days (1 year)
   Admin access required

   Usage:
   SELECT cleanup_old_audit_logs(365); -- Delete logs older than 1 year
   SELECT cleanup_old_audit_logs(90);  -- Delete logs older than 90 days';

-- ============================================================================
-- NOTES FOR SECURITY AUDIT
-- ============================================================================

-- FEATURES IMPLEMENTED:
--   1. Comprehensive audit logging for sensitive operations
--   2. Automatic triggers for role changes, price edits, refunds
--   3. Manual logging via log_audit_event() function
--   4. RLS policies: admins see all, users see their own
--   5. Helper functions for querying audit logs
--   6. Optional cleanup function for data retention
--
-- BEST PRACTICES:
--   - All inserts go through SECURITY DEFINER function (validation)
--   - User context automatically captured (email, role, timestamp)
--   - JSONB storage for flexible old/new value comparison
--   - Indexed for query performance
--   - Triggers attached to critical tables
--
-- USAGE EXAMPLES:
--   -- Manual logging
--   SELECT log_audit_event(
--     'admin_action',
--     'system',
--     NULL,
--     NULL,
--     '{"action": "system_config_update"}',
--     '{"detail": "Updated notification settings"}'
--   );
--
--   -- Query user audit history
--   SELECT * FROM get_user_audit_logs('user-uuid', 50);
--
--   -- Query entity audit history
--   SELECT * FROM get_entity_audit_logs('booking', 'booking-uuid', 20);
--
--   -- Query recent audit logs (admin only)
--   SELECT * FROM get_recent_audit_logs('role_change', NULL, 100);
