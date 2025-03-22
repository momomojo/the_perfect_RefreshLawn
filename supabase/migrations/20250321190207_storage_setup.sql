-- Create service_images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('service_images', 'service_images', TRUE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'service_images');

-- Allow public access to view the images
CREATE POLICY "Allow public viewing" 
ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = 'service_images');

-- Allow authenticated users to update their files
CREATE POLICY "Allow authenticated updates" 
ON storage.objects
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'service_images');

-- Allow authenticated users to delete their files
CREATE POLICY "Allow authenticated deletes" 
ON storage.objects
FOR DELETE 
TO authenticated 
USING (bucket_id = 'service_images'); 