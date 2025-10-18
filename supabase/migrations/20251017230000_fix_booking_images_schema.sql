-- Migration: Fix booking_images schema to match codebase expectations
-- Description: Renames columns to align database schema with application code
--
-- ISSUE: The application code expects columns named 'storage_path' and 'uploaded_at',
-- but the production database has 'image_url' and 'created_at'. This mismatch causes
-- 100% failure rate for all photo uploads.
--
-- This migration resolves the discrepancy by renaming the database columns to match
-- what the code expects.

-- Rename image_url to storage_path
ALTER TABLE booking_images
  RENAME COLUMN image_url TO storage_path;

-- Rename created_at to uploaded_at
ALTER TABLE booking_images
  RENAME COLUMN created_at TO uploaded_at;

-- Add helpful comments
COMMENT ON COLUMN booking_images.storage_path IS
  'Path to image file in Supabase storage bucket. Format: {booking_id}/{filename}.jpg';

COMMENT ON COLUMN booking_images.uploaded_at IS
  'Timestamp when the image was uploaded by technician. Automatically set on insert.';

-- Verify the UNIQUE constraint still references the correct column
-- The original migration had: CONSTRAINT booking_id_storage_path_unique UNIQUE (booking_id, storage_path)
-- This constraint should still work after the column rename, but let's verify it exists

DO $$
BEGIN
  -- Check if the unique constraint exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'booking_id_storage_path_unique'
    AND table_name = 'booking_images'
  ) THEN
    -- If it doesn't exist, create it
    ALTER TABLE booking_images
      ADD CONSTRAINT booking_id_storage_path_unique UNIQUE (booking_id, storage_path);

    RAISE NOTICE 'Created UNIQUE constraint: booking_id_storage_path_unique';
  ELSE
    RAISE NOTICE 'UNIQUE constraint booking_id_storage_path_unique already exists';
  END IF;
END $$;

-- Note: After applying this migration, the following should match:
--
-- DATABASE SCHEMA:
--   - storage_path (text) - path to file in storage
--   - uploaded_at (timestamptz) - upload timestamp
--
-- CODE EXPECTATIONS (JobStatusUpdater.tsx line 401):
--   - storage_path: uploadData.path
--   - uploaded_at: new Date().toISOString()
--
-- This alignment will allow photo uploads to succeed.
