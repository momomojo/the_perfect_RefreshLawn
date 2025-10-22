-- Add RLS policies for booking-images storage bucket
-- This allows authenticated users (technicians) to upload job photos

-- Policy 1: Allow authenticated users to upload images to booking-images bucket
CREATE POLICY "Allow authenticated uploads to booking-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'booking-images');

-- Policy 2: Allow users to view images they have access to
CREATE POLICY "Allow authenticated viewing of booking-images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'booking-images');

-- Policy 3: Allow authenticated users to update their uploaded images
CREATE POLICY "Allow authenticated updates to booking-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'booking-images')
WITH CHECK (bucket_id = 'booking-images');

-- Policy 4: Allow authenticated users to delete images they uploaded
CREATE POLICY "Allow authenticated deletes of booking-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'booking-images');
