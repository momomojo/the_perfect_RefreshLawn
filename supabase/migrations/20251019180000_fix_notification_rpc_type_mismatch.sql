-- Migration: Fix notification RPC functions type mismatch bug
-- Description: Fixes the boolean/integer type mismatch in mark_notification_read and mark_all_notifications_read
-- Bug: ROW_COUNT returns INTEGER, but was being assigned to BOOLEAN variable causing "operator does not exist: boolean > integer"
-- Fix: Change v_success to INTEGER type
-- Version: 20251019180000

-- Set search path for this migration
SET search_path = public, extensions;

-- Drop and recreate mark_notification_read with correct type handling
DROP FUNCTION IF EXISTS public.mark_notification_read(UUID);

CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_notification_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row_count INTEGER;  -- Changed from BOOLEAN to INTEGER
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE
  WHERE id = p_notification_id
  AND user_id = auth.uid();

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RETURN v_row_count > 0;  -- Now comparing INTEGER > INTEGER
END;
$$;

-- Drop and recreate mark_all_notifications_read with correct type handling
DROP FUNCTION IF EXISTS public.mark_all_notifications_read();

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row_count INTEGER;  -- Changed from BOOLEAN to INTEGER
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE
  WHERE user_id = auth.uid()
  AND is_read = FALSE;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RETURN v_row_count > 0;  -- Now comparing INTEGER > INTEGER
END;
$$;

-- Recreate get_unread_notifications_count (no changes needed, but recreating for consistency)
DROP FUNCTION IF EXISTS public.get_unread_notifications_count();

CREATE OR REPLACE FUNCTION public.get_unread_notifications_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.notifications
    WHERE user_id = auth.uid()
    AND is_read = FALSE
  );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notifications_count() TO authenticated;

COMMENT ON FUNCTION public.mark_notification_read(UUID) IS 'Mark a single notification as read for the current user - FIXED: Type mismatch bug';
COMMENT ON FUNCTION public.mark_all_notifications_read() IS 'Mark all unread notifications as read for the current user - FIXED: Type mismatch bug';
COMMENT ON FUNCTION public.get_unread_notifications_count() IS 'Get count of unread notifications for the current user';
