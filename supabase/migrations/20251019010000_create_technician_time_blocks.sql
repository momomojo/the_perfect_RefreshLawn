-- Create technician_time_blocks table for one-time schedule blocks
-- This table stores specific times when technicians are unavailable
-- Examples: lunch breaks, travel time, personal appointments, time off

CREATE TABLE IF NOT EXISTS public.technician_time_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Ensure end time is after start time
  CONSTRAINT valid_time_range CHECK (end_time > start_time),

  -- Prevent exact duplicate blocks
  CONSTRAINT unique_technician_block UNIQUE (technician_id, blocked_date, start_time, end_time)
);

-- Add index for efficient queries by technician
CREATE INDEX idx_technician_time_blocks_technician_id ON public.technician_time_blocks(technician_id);

-- Add index for date-based queries (most common lookup pattern)
CREATE INDEX idx_technician_time_blocks_date ON public.technician_time_blocks(blocked_date);

-- Add composite index for technician + date queries (optimal for availability checking)
CREATE INDEX idx_technician_time_blocks_technician_date ON public.technician_time_blocks(technician_id, blocked_date);

-- Add comments
COMMENT ON TABLE public.technician_time_blocks IS 'Stores one-time schedule blocks when technicians are unavailable';
COMMENT ON COLUMN public.technician_time_blocks.blocked_date IS 'Specific date for this block';
COMMENT ON COLUMN public.technician_time_blocks.start_time IS 'Start time of the block (time only, no date)';
COMMENT ON COLUMN public.technician_time_blocks.end_time IS 'End time of the block (time only, no date)';
COMMENT ON COLUMN public.technician_time_blocks.reason IS 'Optional reason for the block (e.g., "Lunch", "Travel", "Personal")';

-- Enable Row Level Security
ALTER TABLE public.technician_time_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Technicians can view their own time blocks
CREATE POLICY "Technicians can view own time blocks"
  ON public.technician_time_blocks
  FOR SELECT
  USING (
    technician_id = auth.uid()
    OR
    -- Admins can view all time blocks
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy: Technicians can insert their own time blocks
CREATE POLICY "Technicians can insert own time blocks"
  ON public.technician_time_blocks
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

-- RLS Policy: Technicians can update their own time blocks
CREATE POLICY "Technicians can update own time blocks"
  ON public.technician_time_blocks
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

-- RLS Policy: Technicians can delete their own time blocks
CREATE POLICY "Technicians can delete own time blocks"
  ON public.technician_time_blocks
  FOR DELETE
  USING (technician_id = auth.uid());

-- RLS Policy: Admins can manage all time blocks
CREATE POLICY "Admins can manage all time blocks"
  ON public.technician_time_blocks
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

-- RLS Policy: System can read time blocks for availability calculations
-- (This allows the auto-assignment function to check blocks)
CREATE POLICY "System can read time blocks for scheduling"
  ON public.technician_time_blocks
  FOR SELECT
  USING (true); -- All authenticated users can read (needed for availability queries)

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_technician_time_blocks_updated_at()
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
CREATE TRIGGER update_technician_time_blocks_updated_at
  BEFORE UPDATE ON public.technician_time_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_technician_time_blocks_updated_at();

-- Helper function to check if a time range overlaps with any existing blocks
CREATE OR REPLACE FUNCTION public.check_time_block_overlap(
  p_technician_id uuid,
  p_date date,
  p_start_time time,
  p_end_time time,
  p_exclude_block_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_overlap boolean;
BEGIN
  -- Check if the given time range overlaps with any existing blocks
  -- for the same technician on the same date
  SELECT EXISTS (
    SELECT 1
    FROM public.technician_time_blocks
    WHERE technician_id = p_technician_id
      AND blocked_date = p_date
      AND (id != p_exclude_block_id OR p_exclude_block_id IS NULL)
      AND (
        -- New block starts during existing block
        (p_start_time >= start_time AND p_start_time < end_time)
        OR
        -- New block ends during existing block
        (p_end_time > start_time AND p_end_time <= end_time)
        OR
        -- New block completely contains existing block
        (p_start_time <= start_time AND p_end_time >= end_time)
      )
  ) INTO v_has_overlap;

  RETURN v_has_overlap;
END;
$$;

COMMENT ON FUNCTION public.check_time_block_overlap IS 'Checks if a time range overlaps with existing time blocks for a technician on a specific date';
