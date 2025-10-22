-- Create technician_availability table for recurring weekly schedules
-- This table stores when technicians are generally available to take bookings
-- Example: "Monday 9am-5pm", "Tuesday 10am-6pm"

CREATE TABLE IF NOT EXISTS public.technician_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Ensure end time is after start time
  CONSTRAINT valid_time_range CHECK (end_time > start_time),

  -- Prevent overlapping availability blocks for same technician on same day
  CONSTRAINT unique_technician_day UNIQUE (technician_id, day_of_week, start_time, end_time)
);

-- Add index for efficient queries by technician
CREATE INDEX idx_technician_availability_technician_id ON public.technician_availability(technician_id);

-- Add index for active availability lookups
CREATE INDEX idx_technician_availability_active ON public.technician_availability(is_active) WHERE is_active = true;

-- Add composite index for day-based queries
CREATE INDEX idx_technician_availability_day ON public.technician_availability(day_of_week, is_active);

-- Add comments
COMMENT ON TABLE public.technician_availability IS 'Stores recurring weekly availability schedules for technicians';
COMMENT ON COLUMN public.technician_availability.day_of_week IS 'Day of week: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';
COMMENT ON COLUMN public.technician_availability.start_time IS 'Start time of availability window (time only, no date)';
COMMENT ON COLUMN public.technician_availability.end_time IS 'End time of availability window (time only, no date)';
COMMENT ON COLUMN public.technician_availability.is_active IS 'Whether this availability block is currently active (allows soft delete)';

-- Enable Row Level Security
ALTER TABLE public.technician_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Technicians can view their own availability
CREATE POLICY "Technicians can view own availability"
  ON public.technician_availability
  FOR SELECT
  USING (
    technician_id = auth.uid()
    OR
    -- Admins can view all availability
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy: Technicians can insert their own availability
CREATE POLICY "Technicians can insert own availability"
  ON public.technician_availability
  FOR INSERT
  WITH CHECK (
    technician_id = auth.uid()
    AND
    -- Verify the user is actually a technician
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'technician'
    )
  );

-- RLS Policy: Technicians can update their own availability
CREATE POLICY "Technicians can update own availability"
  ON public.technician_availability
  FOR UPDATE
  USING (technician_id = auth.uid())
  WITH CHECK (
    technician_id = auth.uid()
    AND
    -- Verify still a technician
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'technician'
    )
  );

-- RLS Policy: Technicians can delete their own availability
CREATE POLICY "Technicians can delete own availability"
  ON public.technician_availability
  FOR DELETE
  USING (technician_id = auth.uid());

-- RLS Policy: Admins can manage all availability
CREATE POLICY "Admins can manage all availability"
  ON public.technician_availability
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy: Customers can view all active availability (for booking purposes)
CREATE POLICY "Customers can view active availability"
  ON public.technician_availability
  FOR SELECT
  USING (
    is_active = true
    AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'customer'
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_technician_availability_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_technician_availability_updated_at
  BEFORE UPDATE ON public.technician_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.update_technician_availability_updated_at();
