-- Migration: Create admin RLS policy for payments
-- Description: Allows users with admin role to read all payment records

-- Enable RLS (if not already enabled)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if necessary (optional)
-- DROP POLICY IF EXISTS "Service role can do all operations on payments" ON public.payments;
-- DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;

-- Create policy for admin read access
CREATE POLICY "admin_read_all_payments"
ON public.payments
FOR SELECT
USING (auth.is_admin()); 