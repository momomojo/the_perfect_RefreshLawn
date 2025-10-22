/**
 * Rate Limiting Utilities for Supabase Edge Functions
 *
 * Provides protection against abuse, DDoS, and brute force attacks.
 * Uses Supabase database for distributed rate limiting across Edge Function instances.
 *
 * This is the CANONICAL source - all Edge Functions should import from here.
 */

import { getSupabaseClient } from './stripe-utils.ts';

/** Rate limit configuration */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Unique identifier for this rate limit (e.g., "stripe-webhook-ip", "payment-user") */
  limitKey: string;
}

/** Rate limit result */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of requests made in current window */
  currentCount: number;
  /** Maximum requests allowed */
  limit: number;
  /** Milliseconds until the window resets */
  resetIn: number;
  /** ISO timestamp when window resets */
  resetAt: string;
}

/** Pre-configured rate limit profiles */
export const RATE_LIMIT_PROFILES = {
  /** Stripe webhook: 100 requests per 15 minutes per IP */
  STRIPE_WEBHOOK: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    limitKey: 'stripe-webhook',
  },
  /** Payment API: 50 requests per 15 minutes per user */
  PAYMENT_API: {
    maxRequests: 50,
    windowMs: 15 * 60 * 1000, // 15 minutes
    limitKey: 'payment-api',
  },
  /** Auth failures: 5 failed attempts per 15 minutes per IP */
  AUTH_FAILURE: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    limitKey: 'auth-failure',
  },
  /** General API: 100 requests per minute per user */
  GENERAL_API: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    limitKey: 'general-api',
  },
} as const;

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration or profile name
 * @returns Rate limit result with allowed status
 *
 * @example
 * ```typescript
 * const ip = req.headers.get("x-forwarded-for") || "unknown";
 * const result = await checkRateLimit(ip, RATE_LIMIT_PROFILES.STRIPE_WEBHOOK);
 *
 * if (!result.allowed) {
 *   return errorResponse(
 *     `Rate limit exceeded. Try again in ${Math.ceil(result.resetIn / 1000)}s`,
 *     429,
 *     { "Retry-After": String(Math.ceil(result.resetIn / 1000)) }
 *   );
 * }
 * ```
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const supabase = getSupabaseClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  // Build a unique key combining the limit type and identifier
  const rateLimitKey = `${config.limitKey}:${identifier}`;

  try {
    // Clean up old entries first (older than the window)
    await supabase
      .from('rate_limits')
      .delete()
      .lt('created_at', windowStart.toISOString());

    // Count requests in the current window
    const { data: requests, error: countError } = await supabase
      .from('rate_limits')
      .select('id, created_at', { count: 'exact' })
      .eq('key', rateLimitKey)
      .gte('created_at', windowStart.toISOString());

    if (countError) {
      console.error('[RateLimit] Error counting requests:', countError);
      // Fail open - allow request if we can't check the limit
      return {
        allowed: true,
        currentCount: 0,
        limit: config.maxRequests,
        resetIn: config.windowMs,
        resetAt: new Date(now.getTime() + config.windowMs).toISOString(),
      };
    }

    const currentCount = requests?.length || 0;
    const allowed = currentCount < config.maxRequests;

    // Calculate reset time based on oldest request in window
    let resetIn = config.windowMs;
    if (requests && requests.length > 0) {
      const oldestRequest = requests.reduce((oldest, current) => {
        return new Date(current.created_at) < new Date(oldest.created_at)
          ? current
          : oldest;
      });
      const oldestTime = new Date(oldestRequest.created_at).getTime();
      resetIn = config.windowMs - (now.getTime() - oldestTime);
      if (resetIn < 0) resetIn = config.windowMs;
    }

    const resetAt = new Date(now.getTime() + resetIn).toISOString();

    // If allowed, record this request
    if (allowed) {
      const { error: insertError } = await supabase.from('rate_limits').insert({
        key: rateLimitKey,
        created_at: now.toISOString(),
      });

      if (insertError) {
        console.error('[RateLimit] Error recording request:', insertError);
        // Continue anyway - the request is still allowed
      }
    }

    return {
      allowed,
      currentCount: allowed ? currentCount + 1 : currentCount,
      limit: config.maxRequests,
      resetIn,
      resetAt,
    };
  } catch (error) {
    console.error('[RateLimit] Unexpected error:', error);
    // Fail open - allow request if rate limiting fails
    return {
      allowed: true,
      currentCount: 0,
      limit: config.maxRequests,
      resetIn: config.windowMs,
      resetAt: new Date(now.getTime() + config.windowMs).toISOString(),
    };
  }
}

/**
 * Extract IP address from request headers
 * Checks multiple headers to find the real client IP
 *
 * @param req - HTTP request
 * @returns IP address or "unknown"
 */
export function getClientIp(req: Request): string {
  // Check common headers for IP address (in order of preference)
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
    'true-client-ip',
  ];

  for (const header of headers) {
    const value = req.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim();
      if (ip && ip !== 'unknown') {
        return ip;
      }
    }
  }

  return 'unknown';
}

/**
 * Higher-order function to wrap Edge Function handlers with rate limiting
 *
 * @param config - Rate limit configuration
 * @param identifierFn - Function to extract identifier from request (defaults to IP)
 * @returns Middleware wrapper
 *
 * @example
 * ```typescript
 * import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
 * import { withRateLimit, RATE_LIMIT_PROFILES, getClientIp } from "../shared/rate-limit.ts";
 *
 * serve(
 *   withRateLimit(RATE_LIMIT_PROFILES.STRIPE_WEBHOOK, getClientIp)(
 *     async (req) => {
 *       // Your handler logic
 *       return successResponse({ message: "OK" });
 *     }
 *   )
 * );
 * ```
 */
export function withRateLimit(
  config: RateLimitConfig,
  identifierFn: (req: Request) => string | Promise<string> = getClientIp
) {
  return function (
    handler: (req: Request) => Promise<Response>
  ): (req: Request) => Promise<Response> {
    return async (req: Request) => {
      const identifier = await identifierFn(req);
      const result = await checkRateLimit(identifier, config);

      if (!result.allowed) {
        const retryAfterSeconds = Math.ceil(result.resetIn / 1000);

        console.warn(
          `[RateLimit] ${config.limitKey} - Blocked request from ${identifier}: ` +
            `${result.currentCount}/${result.limit} requests in window, ` +
            `retry in ${retryAfterSeconds}s`
        );

        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: `Too many requests. Please try again in ${retryAfterSeconds} seconds.`,
            limit: result.limit,
            current: result.currentCount,
            resetAt: result.resetAt,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfterSeconds),
              'X-RateLimit-Limit': String(result.limit),
              'X-RateLimit-Remaining': String(
                Math.max(0, result.limit - result.currentCount)
              ),
              'X-RateLimit-Reset': result.resetAt,
            },
          }
        );
      }

      // Add rate limit headers to successful responses
      const response = await handler(req);

      // Clone response to add headers
      const newHeaders = new Headers(response.headers);
      newHeaders.set('X-RateLimit-Limit', String(result.limit));
      newHeaders.set(
        'X-RateLimit-Remaining',
        String(Math.max(0, result.limit - result.currentCount))
      );
      newHeaders.set('X-RateLimit-Reset', result.resetAt);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    };
  };
}

/**
 * Increment failed auth attempt counter
 * Use this to track brute force attempts
 *
 * @param identifier - IP address or user identifier
 * @returns Current failure count
 */
export async function recordAuthFailure(identifier: string): Promise<number> {
  const result = await checkRateLimit(
    identifier,
    RATE_LIMIT_PROFILES.AUTH_FAILURE
  );

  if (!result.allowed) {
    console.warn(
      `[RateLimit] Auth failure limit exceeded for ${identifier}: ` +
        `${result.currentCount}/${result.limit} attempts`
    );
  }

  return result.currentCount;
}

/**
 * Check if an identifier has exceeded auth failure limit
 *
 * @param identifier - IP address or user identifier
 * @returns True if blocked due to too many failures
 */
export async function isAuthBlocked(identifier: string): Promise<boolean> {
  const result = await checkRateLimit(
    identifier,
    RATE_LIMIT_PROFILES.AUTH_FAILURE
  );
  return !result.allowed;
}
