-- Create trigger to send push notifications when new notifications are created

-- Function to call edge function for push notifications
CREATE OR REPLACE FUNCTION notify_push_on_notification_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_function_url TEXT;
  v_service_role_key TEXT;
BEGIN
  -- Get edge function URL from settings
  SELECT decrypted_secret INTO v_function_url
  FROM vault.decrypted_secrets
  WHERE name = 'PUSH_NOTIFICATION_FUNCTION_URL';

  -- Get service role key
  SELECT decrypted_secret INTO v_service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY';

  -- If URL not configured, skip (allows development without push notifications)
  IF v_function_url IS NULL THEN
    RAISE NOTICE 'Push notification function URL not configured, skipping';
    RETURN NEW;
  END IF;

  -- Call edge function asynchronously using pg_net
  PERFORM
    net.http_post(
      url := v_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body := jsonb_build_object(
        'notification_id', NEW.id
      )
    );

  RETURN NEW;
END;
$$;

-- Create trigger on notifications INSERT
DROP TRIGGER IF EXISTS trg_send_push_notification ON notifications;
CREATE TRIGGER trg_send_push_notification
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_push_on_notification_insert();

-- Add comment
COMMENT ON FUNCTION notify_push_on_notification_insert() IS 'Calls edge function to send push notification when new notification is created';
COMMENT ON TRIGGER trg_send_push_notification ON notifications IS 'Sends push notification to user device when new notification is inserted';
