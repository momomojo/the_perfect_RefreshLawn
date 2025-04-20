-- Migration: Create the booking_images table to store metadata for job photos
-- Timestamp: 20250619013300

-- Create the table to store metadata about uploaded images
CREATE TABLE public.booking_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE, -- Link to the booking, delete image record if booking is deleted
  storage_path text NOT NULL UNIQUE, -- Store the path within the Supabase Storage bucket
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Link to the user who uploaded (optional, depends on your profiles table)
  uploaded_at timestamptz DEFAULT now() NOT NULL,
  -- Add any other metadata you might need, e.g., image caption, file size, etc.
  CONSTRAINT booking_id_storage_path_unique UNIQUE (booking_id, storage_path) -- Ensure unique paths per booking
);

-- Add comments for clarity
COMMENT ON TABLE public.booking_images IS 'Stores metadata for images associated with specific bookings.';
COMMENT ON COLUMN public.booking_images.booking_id IS 'Foreign key linking to the bookings table.';
COMMENT ON COLUMN public.booking_images.storage_path IS 'The unique path to the image file in the Supabase Storage bucket (e.g., booking_id/image_uuid.jpg).';
COMMENT ON COLUMN public.booking_images.uploaded_by IS 'The profile ID of the user (technician) who uploaded the image.';
COMMENT ON COLUMN public.booking_images.uploaded_at IS 'Timestamp when the image was uploaded.';

-- Create an index for efficient querying by booking_id
CREATE INDEX idx_booking_images_booking_id ON public.booking_images (booking_id);

-- Enable Row Level Security on the new table
ALTER TABLE public.booking_images ENABLE ROW LEVEL SECURITY;
