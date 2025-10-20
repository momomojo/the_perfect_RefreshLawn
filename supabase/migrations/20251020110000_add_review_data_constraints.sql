-- Migration: Add data integrity constraints to reviews table
-- Description: Enforces rating range, comment length, and admin role validation
-- Version: 20251020110000

-- Add constraint to ensure rating is between 1 and 5
ALTER TABLE public.reviews
ADD CONSTRAINT check_rating_range
CHECK (rating >= 1 AND rating <= 5);

-- Add constraint to ensure comment length doesn't exceed 500 characters
ALTER TABLE public.reviews
ADD CONSTRAINT check_comment_length
CHECK (comment IS NULL OR LENGTH(comment) <= 500);

-- Add constraint to ensure admin_reviewed_by is actually an admin
-- Note: This uses a correlated subquery which is validated at row insert/update time
ALTER TABLE public.reviews
ADD CONSTRAINT check_reviewer_is_admin
CHECK (
  admin_reviewed_by IS NULL OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = admin_reviewed_by
    AND profiles.role = 'admin'
  )
);

-- Add constraint to ensure admin_reviewed_at is set when admin_reviewed is true
ALTER TABLE public.reviews
ADD CONSTRAINT check_reviewed_timestamp
CHECK (
  (admin_reviewed = FALSE AND admin_reviewed_at IS NULL) OR
  (admin_reviewed = TRUE AND admin_reviewed_at IS NOT NULL)
);

-- Add constraint to ensure admin_reviewed_by is set when admin_reviewed is true
ALTER TABLE public.reviews
ADD CONSTRAINT check_reviewed_by
CHECK (
  (admin_reviewed = FALSE AND admin_reviewed_by IS NULL) OR
  (admin_reviewed = TRUE AND admin_reviewed_by IS NOT NULL)
);

-- Comments explaining the constraints
COMMENT ON CONSTRAINT check_rating_range ON public.reviews IS 'Ensures rating is within valid 1-5 star range';
COMMENT ON CONSTRAINT check_comment_length ON public.reviews IS 'Prevents comment from exceeding 500 character limit';
COMMENT ON CONSTRAINT check_reviewer_is_admin ON public.reviews IS 'Ensures only admin users can mark reviews as reviewed';
COMMENT ON CONSTRAINT check_reviewed_timestamp ON public.reviews IS 'Ensures timestamp is set when review is marked as reviewed';
COMMENT ON CONSTRAINT check_reviewed_by ON public.reviews IS 'Ensures reviewer ID is set when review is marked as reviewed';
