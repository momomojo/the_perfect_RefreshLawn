-- Migration: Add constraints to reviews table for data integrity
-- Description: Adds UNIQUE constraint on booking_id and CHECK constraint for rating range
-- Version: 20251020170000

-- Add UNIQUE constraint on booking_id to prevent duplicate reviews (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'reviews_booking_id_unique'
    ) THEN
        ALTER TABLE public.reviews
        ADD CONSTRAINT reviews_booking_id_unique UNIQUE (booking_id);

        COMMENT ON CONSTRAINT reviews_booking_id_unique ON public.reviews IS
        'Ensures only one review can exist per booking';
    END IF;
END $$;

-- CHECK constraint for rating already exists from previous migration, skip it

-- Improve index for admin feedback queries
-- Drop the partial index and create a better composite index
DROP INDEX IF EXISTS public.idx_reviews_admin_unreviewed;

CREATE INDEX IF NOT EXISTS idx_reviews_admin_pending
ON public.reviews(admin_feedback, admin_reviewed, created_at DESC)
WHERE admin_feedback = TRUE;

COMMENT ON INDEX idx_reviews_admin_pending IS
'Optimizes queries for pending admin feedback ordered by creation date';
