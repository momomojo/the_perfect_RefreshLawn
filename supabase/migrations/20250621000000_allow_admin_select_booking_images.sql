-- Migration: Allow admin to view booking_images metadata
-- Timestamp: 20250621000000

-- Drop the old policy to avoid conflicts
DROP POLICY IF EXISTS "Users can view images for their bookings" ON public.booking_images;

-- Recreate policy including admin role
CREATE POLICY "Users can view images for their bookings"
ON public.booking_images
FOR SELECT
TO authenticated
USING (
  -- Admins can view any booking_images record
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR
  -- Technicians or customers can view only their booking images
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id
      AND (
        b.customer_id = auth.uid()
        OR b.technician_id = auth.uid()
      )
  )
);

COMMENT ON POLICY "Users can view images for their bookings" ON public.booking_images IS 'Allow admins, customers, or technicians to view booking_images metadata'; 