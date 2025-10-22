-- Migration: Create rate limiting table for Edge Functions
-- Description: Enables distributed rate limiting across Edge Function instances
--              Prevents abuse, DDoS, and brute force attacks
-- Priority: P0 - CRITICAL SECURITY

-- ============================================================================
-- RATE LIMITING TABLE
-- ============================================================================

-- Create table to track rate limit requests
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,           -- Format: "limitType:identifier" (e.g., "stripe-webhook:192.168.1.1")
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Index for fast lookups and cleanup
  CONSTRAINT rate_limits_key_created_at_idx UNIQUE (key, created_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON public.rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at ON public.rate_limits(created_at);

-- Composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created_at
  ON public.rate_limits(key, created_at DESC);

-- Add comment explaining the table
COMMENT ON TABLE public.rate_limits IS
  'Tracks rate limit requests for Edge Functions. Each row represents a single request.
   Rows older than the rate limit window are automatically cleaned up.

   Key format examples:
   - "stripe-webhook:192.168.1.1" - Stripe webhook from IP 192.168.1.1
   - "payment-api:user-123" - Payment API call from user 123
   - "auth-failure:192.168.1.1" - Failed auth attempt from IP 192.168.1.1

   This table is written to by Edge Functions via the rate-limit.ts utility.
   No RLS policies needed as this is only accessed by Edge Functions with service role.';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No RLS policies - this table is only accessed by Edge Functions with service role key
-- Edge Functions bypass RLS, so no policies needed
-- This also prevents client-side access, which is desirable for security

-- ============================================================================
-- AUTOMATIC CLEANUP FUNCTION
-- ============================================================================

-- Function to clean up old rate limit entries
-- Removes entries older than 1 hour to prevent table bloat
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE created_at < now() - INTERVAL '1 hour';

  RAISE NOTICE '[cleanup_old_rate_limits] Cleaned up rate limit entries older than 1 hour';
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_rate_limits() IS
  'Removes rate limit entries older than 1 hour.
   Should be called periodically (e.g., via cron or scheduled job).

   Manual execution:
   SELECT public.cleanup_old_rate_limits();';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to service role (Edge Functions)
-- Note: In Supabase, service role automatically has full access
-- These grants are explicit for clarity

GRANT SELECT, INSERT, DELETE ON public.rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_rate_limits() TO service_role;

-- ============================================================================
-- USAGE NOTES
-- ============================================================================

-- To manually clean up old entries:
--   SELECT public.cleanup_old_rate_limits();
--
-- To check current rate limit usage:
--   SELECT key, COUNT(*) as request_count,
--          MIN(created_at) as oldest, MAX(created_at) as newest
--   FROM public.rate_limits
--   WHERE created_at > now() - INTERVAL '15 minutes'
--   GROUP BY key
--   ORDER BY request_count DESC;
--
-- To see all rate limit keys:
--   SELECT DISTINCT split_part(key, ':', 1) as limit_type, COUNT(*) as unique_identifiers
--   FROM public.rate_limits
--   GROUP BY limit_type;
--
-- To check if a specific IP is being rate limited:
--   SELECT COUNT(*) FROM public.rate_limits
--   WHERE key LIKE 'stripe-webhook:192.168.1.1%'
--     AND created_at > now() - INTERVAL '15 minutes';
