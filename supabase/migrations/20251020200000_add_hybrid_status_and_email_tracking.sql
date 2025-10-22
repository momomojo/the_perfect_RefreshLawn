-- Migration: Add hybrid status and email tracking
-- Description: Adds separate payment_status and workflow_status columns to bookings table,
--              adds email tracking fields, and adds technician auto-send setting to profiles.
--              Maintains backward compatibility by keeping the original status column.

-- ============================================================================
-- ADD NEW COLUMNS TO BOOKINGS TABLE
-- ============================================================================

-- Add payment tracking column
ALTER TABLE public.bookings
  ADD COLUMN payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'processing', 'confirmed', 'failed', 'refunded'));

-- Add workflow tracking column
ALTER TABLE public.bookings
  ADD COLUMN workflow_status TEXT DEFAULT 'pending_assignment'
    CHECK (workflow_status IN ('pending_assignment', 'scheduled', 'in_progress', 'completed', 'cancelled'));

-- Add email notification tracking columns
ALTER TABLE public.bookings
  ADD COLUMN report_email_sent BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN report_email_sent_at TIMESTAMPTZ,
  ADD COLUMN report_email_sent_by UUID REFERENCES public.profiles(id);

-- ============================================================================
-- ADD TECHNICIAN SETTING TO PROFILES TABLE
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN auto_send_job_reports BOOLEAN DEFAULT TRUE NOT NULL;

-- ============================================================================
-- BACKFILL EXISTING DATA
-- ============================================================================

-- Map current status column to new hybrid status columns
UPDATE public.bookings SET
  payment_status = CASE
    -- Payment-related statuses
    WHEN status IN ('pending_payment', 'payment_processing') THEN 'pending'
    WHEN status = 'payment_confirmed' THEN 'confirmed'
    WHEN status = 'payment_failed' THEN 'failed'
    WHEN status = 'payment_refunded' THEN 'refunded'
    -- Workflow statuses imply payment is confirmed
    WHEN status IN ('scheduled', 'rescheduled', 'in_progress', 'completed', 'no_show') THEN 'confirmed'
    -- Default
    ELSE 'pending'
  END,
  workflow_status = CASE
    -- Statuses waiting for assignment
    WHEN status IN ('pending', 'pending_payment', 'payment_processing', 'payment_confirmed') THEN 'pending_assignment'
    -- Workflow statuses
    WHEN status IN ('scheduled', 'rescheduled') THEN 'scheduled'
    WHEN status = 'in_progress' THEN 'in_progress'
    WHEN status IN ('completed', 'no_show') THEN 'completed'
    WHEN status = 'cancelled' THEN 'cancelled'
    -- Default
    ELSE 'pending_assignment'
  END;

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for filtering by payment status
CREATE INDEX idx_bookings_payment_status
  ON public.bookings(payment_status);

-- Index for filtering by workflow status
CREATE INDEX idx_bookings_workflow_status
  ON public.bookings(workflow_status);

-- Index for finding jobs with pending email (admin dashboard)
CREATE INDEX idx_bookings_report_email_pending
  ON public.bookings(report_email_sent)
  WHERE report_email_sent = FALSE AND workflow_status = 'completed';

-- Composite index for common query patterns
CREATE INDEX idx_bookings_workflow_payment
  ON public.bookings(workflow_status, payment_status);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.bookings.payment_status IS
  'Tracks payment state: pending (awaiting payment), processing (payment in progress), confirmed (payment successful), failed (payment unsuccessful), refunded (payment returned)';

COMMENT ON COLUMN public.bookings.workflow_status IS
  'Tracks work state: pending_assignment (needs technician), scheduled (technician assigned), in_progress (work started), completed (work finished), cancelled (booking cancelled)';

COMMENT ON COLUMN public.bookings.report_email_sent IS
  'Flag indicating if customer job report email has been sent';

COMMENT ON COLUMN public.bookings.report_email_sent_at IS
  'Timestamp when job report email was sent to customer';

COMMENT ON COLUMN public.bookings.report_email_sent_by IS
  'User ID (technician or admin) who triggered the email send';

COMMENT ON COLUMN public.profiles.auto_send_job_reports IS
  'Technician setting: if TRUE, job reports are automatically emailed when job is completed';
