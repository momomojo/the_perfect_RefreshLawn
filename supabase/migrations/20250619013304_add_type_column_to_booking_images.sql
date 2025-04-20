-- Migration: Add `type` column to booking_images table
-- Timestamp: 20250619013304

ALTER TABLE public.booking_images
  ADD COLUMN type TEXT NOT NULL DEFAULT 'before';

-- If you have existing records, adjust or backfill values accordingly

-- End of migration 