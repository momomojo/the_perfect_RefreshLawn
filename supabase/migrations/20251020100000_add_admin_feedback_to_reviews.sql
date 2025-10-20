-- Migration: Add admin feedback support to reviews table
-- Description: Adds admin_feedback flag and reviewed tracking for low-rated reviews
-- Version: 20251020100000

-- Add admin_feedback boolean column to track reviews that need admin attention
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS admin_feedback BOOLEAN DEFAULT FALSE;

-- Add tracking columns for admin review workflow
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS admin_reviewed BOOLEAN DEFAULT FALSE;

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS admin_reviewed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS admin_reviewed_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add index for faster queries on admin feedback reviews
CREATE INDEX IF NOT EXISTS idx_reviews_admin_feedback
ON public.reviews(admin_feedback)
WHERE admin_feedback = TRUE;

-- Add index for unreviewed admin feedback
CREATE INDEX IF NOT EXISTS idx_reviews_admin_unreviewed
ON public.reviews(admin_feedback, admin_reviewed)
WHERE admin_feedback = TRUE AND admin_reviewed = FALSE;

-- Update RLS policies to allow admins to see all reviews including admin feedback
-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own reviews as customer" ON public.reviews;
DROP POLICY IF EXISTS "Users can view reviews for their services as technician" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can view all reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can update reviews" ON public.reviews;

-- Recreate policies with admin access
CREATE POLICY "Users can view their own reviews as customer"
ON public.reviews FOR SELECT
USING (
  auth.uid() = customer_id
);

CREATE POLICY "Users can view reviews for their services as technician"
ON public.reviews FOR SELECT
USING (
  auth.uid() = technician_id
);

CREATE POLICY "Users can create reviews"
ON public.reviews FOR INSERT
WITH CHECK (
  auth.uid() = customer_id
);

CREATE POLICY "Admins can view all reviews"
ON public.reviews FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update reviews"
ON public.reviews FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Add comment to explain the columns
COMMENT ON COLUMN public.reviews.admin_feedback IS 'Flag indicating this review requires admin attention (typically low ratings with feedback)';
COMMENT ON COLUMN public.reviews.admin_reviewed IS 'Flag indicating an admin has reviewed this feedback';
COMMENT ON COLUMN public.reviews.admin_reviewed_at IS 'Timestamp when admin reviewed the feedback';
COMMENT ON COLUMN public.reviews.admin_reviewed_by IS 'Admin user ID who reviewed the feedback';
COMMENT ON COLUMN public.reviews.admin_notes IS 'Admin notes about the review or actions taken';
