-- Migration: Fix storage bucket and RLS for booking-images
-- Timestamp: 20250619013306

-- 1. Create the hyphenated 'booking-images' bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('booking-images', 'booking-images', false, null, ARRAY['image/jpeg','image/png','image/gif','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 2. Drop outdated policies referencing underscore bucket id
DROP POLICY IF EXISTS "Technicians can upload booking images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view booking images" ON storage.objects;
DROP POLICY IF EXISTS "Technicians can delete booking images" ON storage.objects;

-- 3. Recreate RLS policies for the hyphenated bucket
-- Allow technicians to upload images for their bookings
CREATE POLICY "Technicians can upload booking images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'booking-images'
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = (string_to_array(name, '/'))[1]::uuid
        AND b.technician_id = auth.uid()
    )
  );

-- Allow associated customer or technician to view/download images
CREATE POLICY "Users can view booking images" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'booking-images'
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = (string_to_array(name, '/'))[1]::uuid
        AND (b.customer_id = auth.uid() OR b.technician_id = auth.uid())
    )
  );

-- Allow technicians to delete their images from storage
CREATE POLICY "Technicians can delete booking images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'booking-images'
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = (string_to_array(name, '/'))[1]::uuid
        AND b.technician_id = auth.uid()
    )
  ); 