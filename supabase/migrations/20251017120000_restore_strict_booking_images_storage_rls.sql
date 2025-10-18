-- Migration: Restore Strict Storage RLS Policies for booking-images
--
-- This migration fixes a security regression introduced in migration 20251016060000
-- where storage.objects policies were made overly permissive (any authenticated user
-- could upload/delete/view ANY images in the bucket).
--
-- This migration restores the strict policies that:
-- - Only allow assigned technicians to upload photos for their jobs
-- - Only allow customers and technicians to view photos for their bookings
-- - Only allow assigned technicians to delete photos from their jobs
-- - Allow admins full access

-- Drop the overly permissive policies from migration 20251016060000
DROP POLICY IF EXISTS "Allow authenticated uploads to booking-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated viewing of booking-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to booking-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes of booking-images" ON storage.objects;

-- CREATE STRICT POLICY: Only assigned technicians can upload photos
-- Path format: {booking_id}/{filename}.jpg
-- Extracts booking_id from path and verifies the current user is the assigned technician
CREATE POLICY "Technicians can upload booking images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'booking-images'
  AND EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = (string_to_array(name, '/'))[1]::uuid
      AND b.technician_id = auth.uid()
  )
);

-- CREATE STRICT POLICY: Customers and technicians can view photos for their bookings
-- Path format: {booking_id}/{filename}.jpg
CREATE POLICY "Users can view booking images for their bookings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'booking-images'
  AND (
    -- Admin bypass: admins can view all photos
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
    OR
    -- Customers and technicians can view photos for their bookings
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = (string_to_array(name, '/'))[1]::uuid
        AND (
          b.customer_id = auth.uid()
          OR b.technician_id = auth.uid()
        )
    )
  )
);

-- CREATE STRICT POLICY: Only assigned technicians (or admins) can delete photos
CREATE POLICY "Technicians can delete booking images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'booking-images'
  AND (
    -- Admin bypass: admins can delete any photo
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
    OR
    -- Technicians can delete photos from their jobs
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = (string_to_array(name, '/'))[1]::uuid
        AND b.technician_id = auth.uid()
    )
  )
);

-- CREATE STRICT POLICY: Only assigned technicians (or admins) can update photo metadata
CREATE POLICY "Technicians can update booking images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'booking-images'
  AND (
    -- Admin bypass
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
    OR
    -- Technicians can update their job photos
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = (string_to_array(name, '/'))[1]::uuid
        AND b.technician_id = auth.uid()
    )
  )
)
WITH CHECK (
  bucket_id = 'booking-images'
  AND (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = (string_to_array(name, '/'))[1]::uuid
        AND b.technician_id = auth.uid()
    )
  )
);

-- Add helpful comments
COMMENT ON POLICY "Technicians can upload booking images" ON storage.objects IS
'Restricts photo uploads to only the technician assigned to the booking. Path must follow format: {booking_id}/{filename}.jpg';

COMMENT ON POLICY "Users can view booking images for their bookings" ON storage.objects IS
'Allows customers and technicians to view photos for their own bookings. Admins can view all photos.';

COMMENT ON POLICY "Technicians can delete booking images" ON storage.objects IS
'Allows technicians to delete photos from their assigned jobs. Admins can delete any photo.';

COMMENT ON POLICY "Technicians can update booking images" ON storage.objects IS
'Allows technicians to update photo metadata for their assigned jobs. Admins can update any photo.';