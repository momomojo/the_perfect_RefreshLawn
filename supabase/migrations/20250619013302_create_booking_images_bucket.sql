-- Migration: Placeholder for creating the 'booking_images' storage bucket
-- Timestamp: 20250619013302

-- This step is typically performed manually via the Supabase Dashboard or Management API.
-- Ensure the bucket 'booking_images' is created with 'public' set to false.

-- Example SQL (run manually or via dashboard/API if needed):
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('booking-images', 'booking-images', false, null, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
