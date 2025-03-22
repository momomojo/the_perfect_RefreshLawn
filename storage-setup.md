# Supabase Storage Setup for RefreshLawn

This guide will help you set up the storage bucket needed for image uploads in the RefreshLawn application.

## Option 1: Using the Supabase Dashboard (Recommended)

1. Go to your [Supabase dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to Storage in the left sidebar
4. Click "Create a new bucket"
5. Enter "service_images" as the bucket name
6. Check the "Public bucket" option
7. Click "Create bucket"
8. After creating the bucket, click on "Policies" tab
9. Add the following policies:

### For Upload (INSERT) operations:

- Click "Add policy"
- Select "INSERT" operation
- Name: "Allow authenticated uploads"
- Policy definition: `(auth.role() = 'authenticated')`
- Click "Save policy"

### For View (SELECT) operations:

- Click "Add policy"
- Select "SELECT" operation
- Name: "Allow public viewing"
- Policy definition: `(bucket_id = 'service_images')`
- Click "Save policy"

### For Update (UPDATE) operations:

- Click "Add policy"
- Select "UPDATE" operation
- Name: "Allow authenticated updates"
- Policy definition: `(auth.role() = 'authenticated')`
- Click "Save policy"

### For Delete (DELETE) operations:

- Click "Add policy"
- Select "DELETE" operation
- Name: "Allow authenticated deletes"
- Policy definition: `(auth.role() = 'authenticated')`
- Click "Save policy"

## Option 2: Using SQL Migration

If you prefer using SQL, you can run the migration in `supabase/migrations/20240720000000_storage_setup.sql` using the Supabase CLI:

```bash
supabase migration up
```

Or execute the SQL directly in the Supabase SQL Editor:

```sql
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
```

## Verifying the Setup

After setting up the storage bucket, you should be able to:

1. Log in to the RefreshLawn application
2. Go to the "Services" page
3. Add or edit a service
4. Upload an image by clicking on the camera icon
5. Save the service and see the uploaded image

If you encounter any issues, check the browser console for detailed error messages.
