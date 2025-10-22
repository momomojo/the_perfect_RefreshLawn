-- Migration: Fix notification RPC functions with proper search path
-- Description: Recreates notification RPC functions with explicit search path for reliability
-- Version: 20251019000000

-- Set search path for this migration
SET search_path = public, extensions;

-- Drop and recreate mark_notification_read with explicit search path
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
  v_success BOOLEAN;
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE
  WHERE id = p_notification_id
  AND user_id = auth.uid();

  GET DIAGNOSTICS v_success = ROW_COUNT;
  RETURN v_success > 0;
END;
$$;

-- Drop and recreate mark_all_notifications_read with explicit search path
DROP FUNCTION IF EXISTS public.mark_all_notifications_read();

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_success BOOLEAN;
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE
  WHERE user_id = auth.uid()
  AND is_read = FALSE;

  GET DIAGNOSTICS v_success = ROW_COUNT;
  RETURN v_success > 0;
END;
$$;

-- Drop and recreate get_unread_notifications_count with explicit search path
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

COMMENT ON FUNCTION public.mark_notification_read(UUID) IS 'Mark a single notification as read for the current user';
COMMENT ON FUNCTION public.mark_all_notifications_read() IS 'Mark all unread notifications as read for the current user';
COMMENT ON FUNCTION public.get_unread_notifications_count() IS 'Get count of unread notifications for the current user';
