-- Migration: Fix CORS settings for Storage to enable web uploads
-- Timestamp: 20250619013310

-- NOTE: This migration was modified to remove the CORS configuration
-- because the cors_rules column doesn't exist in the storage.buckets table.
-- Please configure CORS manually through the Supabase Dashboard:
-- 1. Go to Storage → booking-images → Settings → CORS configuration
-- 2. Add a CORS rule with:
--    - Allowed Origins: *
--    - Allowed Methods: GET,POST,PUT,DELETE,OPTIONS
--    - Allowed Headers: Authorization,Content-Type,x-client-info,apikey,X-Client-Info
--    - Exposed Headers: Content-Range,Range
--    - Max Age: 3600

-- Ensure the bucket is created
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-images', 'booking-images', false)
ON CONFLICT (id) DO NOTHING;

-- End of migration 