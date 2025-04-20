-- Migration: Apply RLS policies for booking_images table and storage bucket
-- Timestamp: 20250619013301

-- === booking_images Table RLS ===

-- RLS Policy: Allow technicians to upload (insert) images for their assigned bookings
DROP POLICY IF EXISTS "Technicians can insert images for their bookings" ON public.booking_images;
CREATE POLICY "Technicians can insert images for their bookings"
ON public.booking_images
FOR INSERT
TO authenticated -- Use 'authenticated' or a specific role if you have one for technicians
WITH CHECK (
  -- Check if the uploader is the assigned technician for the booking
  EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = booking_id AND b.technician_id = auth.uid()
  )
  -- Ensure the 'uploaded_by' field matches the authenticated user (if using this field)
  AND uploaded_by = auth.uid()
);

-- RLS Policy: Allow associated customer and technician to view image metadata
DROP POLICY IF EXISTS "Users can view images for their bookings" ON public.booking_images;
CREATE POLICY "Users can view images for their bookings"
ON public.booking_images
FOR SELECT
TO authenticated
USING (
  -- Check if the user is the customer OR the assigned technician for the booking
  EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR b.technician_id = auth.uid())
  )
);

-- RLS Policy: Allow technicians to delete their uploaded images (optional)
DROP POLICY IF EXISTS "Technicians can delete their uploaded images" ON public.booking_images;
CREATE POLICY "Technicians can delete their uploaded images"
ON public.booking_images
FOR DELETE
TO authenticated -- Use 'authenticated' or a specific technician role
USING (
  -- Check if the user is the one who uploaded the image
  uploaded_by = auth.uid()
  -- Alternatively, or additionally, check if they are the assigned technician for the booking:
  -- AND EXISTS ( SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.technician_id = auth.uid() )
);

-- === booking-images Storage Bucket RLS ===

-- First, enable RLS on the storage.buckets table if not already enabled
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Make the booking-images bucket private (not public)
UPDATE storage.buckets SET public = FALSE WHERE name = 'booking-images';

-- Add policies for the storage.objects table for the booking-images bucket

-- INSERT: Allow authenticated users to upload files
DROP POLICY IF EXISTS "Allow authenticated uploads to booking-images" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to booking-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'booking-images' AND 
  auth.role() = 'authenticated'
);

-- SELECT: Allow authenticated users to view files
DROP POLICY IF EXISTS "Allow authenticated viewing of booking-images" ON storage.objects;
CREATE POLICY "Allow authenticated viewing of booking-images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'booking-images' AND 
  auth.role() = 'authenticated'
);

-- UPDATE: Allow authenticated users to update files
DROP POLICY IF EXISTS "Allow authenticated updates to booking-images" ON storage.objects;
CREATE POLICY "Allow authenticated updates to booking-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'booking-images' AND 
  auth.role() = 'authenticated'
);

-- DELETE: Allow authenticated users to delete files
DROP POLICY IF EXISTS "Allow authenticated deletes of booking-images" ON storage.objects;
CREATE POLICY "Allow authenticated deletes of booking-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'booking-images' AND 
  auth.role() = 'authenticated'
);

-- Note: Additional security policies can be added later to restrict access by booking ID
-- For now, we're using simple authenticated access policies to fix the immediate upload issue
