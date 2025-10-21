-- Add notification preference fields to profiles table

-- Add push token field
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Add notification preference fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_sound_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_vibration_enabled BOOLEAN DEFAULT TRUE;

-- Add notification type preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS booking_notifications BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_notifications BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS review_notifications BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS message_notifications BOOLEAN DEFAULT TRUE;

-- Create index on push_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token) WHERE push_token IS NOT NULL;

-- Add comment
COMMENT ON COLUMN profiles.push_token IS 'Expo push notification token for mobile devices';
COMMENT ON COLUMN profiles.push_notifications_enabled IS 'Master toggle for push notifications';
COMMENT ON COLUMN profiles.notification_sound_enabled IS 'Enable sound for notifications';
COMMENT ON COLUMN profiles.notification_vibration_enabled IS 'Enable vibration for notifications';
COMMENT ON COLUMN profiles.booking_notifications IS 'Receive booking-related notifications';
COMMENT ON COLUMN profiles.payment_notifications IS 'Receive payment-related notifications';
COMMENT ON COLUMN profiles.review_notifications IS 'Receive review-related notifications';
COMMENT ON COLUMN profiles.message_notifications IS 'Receive message-related notifications';
