/**
 * Retry Utilities with Exponential Backoff
 *
 * Prevents lost data due to transient failures (network issues, database timeouts, etc.)
 * by automatically retrying operations with increasing delays.
 *
 * This is the CANONICAL implementation for all Edge Functions.
 */

export interface RetryOptions {
  maxAttempts?: number; // Maximum number of retry attempts (default: 3)
  initialDelayMs?: number; // Initial delay in milliseconds (default: 1000ms = 1s)
  maxDelayMs?: number; // Maximum delay in milliseconds (default: 10000ms = 10s)
  backoffMultiplier?: number; // Exponential backoff multiplier (default: 2)
  shouldRetry?: (error: unknown) => boolean; // Custom logic to determine if error is retryable
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void; // Callback before each retry
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
  totalTimeMs: number;
}

/**
 * Default errors that should be retried (transient failures)
 */
const RETRYABLE_ERROR_PATTERNS = [
  /network/i,
  /timeout/i,
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /503/i, // Service Unavailable
  /504/i, // Gateway Timeout
  /502/i, // Bad Gateway
  /connection/i,
  /temporary/i,
  /transient/i,
  /deadlock/i, // PostgreSQL deadlock
  /lock timeout/i, // PostgreSQL lock timeout
];

/**
 * Check if an error is retryable based on common transient error patterns
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : '';

  // Check against known retryable patterns
  return RETRYABLE_ERROR_PATTERNS.some(
    (pattern) => pattern.test(errorMessage) || pattern.test(errorName)
  );
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number
): number {
  // Exponential backoff: delay = initialDelay * (multiplier ^ attempt)
  const exponentialDelay =
    initialDelayMs * Math.pow(backoffMultiplier, attempt);

  // Add jitter (±20%) to prevent thundering herd
  const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);
  const delayWithJitter = exponentialDelay + jitter;

  // Cap at maxDelay
  return Math.min(delayWithJitter, maxDelayMs);
}

/**
 * Execute a function with exponential backoff retry logic
 *
 * @param fn - Async function to execute
 * @param options - Retry configuration options
 * @returns RetryResult with success status, data, and metadata
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => {
 *     return await supabase.from('bookings').insert({ ... });
 *   },
 *   {
 *     maxAttempts: 3,
 *     onRetry: (attempt, error, delay) => {
 *       console.log(`Retry attempt ${attempt} after ${delay}ms due to:`, error);
 *     }
 *   }
 * );
 *
 * if (result.success) {
 *   console.log('Operation succeeded:', result.data);
 * } else {
 *   console.error('Operation failed after retries:', result.error);
 * }
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    shouldRetry = isRetryableError,
    onRetry,
  } = options;

  const startTime = Date.now();
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Execute the function
      const data = await fn();

      // Success!
      return {
        success: true,
        data,
        attempts: attempt + 1,
        totalTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error;

      // Check if this is the last attempt
      const isLastAttempt = attempt === maxAttempts - 1;

      // Check if error is retryable
      const isRetryable = shouldRetry(error);

      if (!isRetryable || isLastAttempt) {
        // Don't retry - either not retryable or out of attempts
        return {
          success: false,
          error,
          attempts: attempt + 1,
          totalTimeMs: Date.now() - startTime,
        };
      }

      // Calculate delay for next retry
      const delayMs = calculateDelay(
        attempt,
        initialDelayMs,
        maxDelayMs,
        backoffMultiplier
      );

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error, delayMs);
      }

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  // Should never reach here, but TypeScript needs it
  return {
    success: false,
    error: lastError,
    attempts: maxAttempts,
    totalTimeMs: Date.now() - startTime,
  };
}

/**
 * Higher-order function to wrap an async function with retry logic
 *
 * @param fn - Async function to wrap
 * @param options - Retry configuration options
 * @returns Wrapped function that includes retry logic
 *
 * @example
 * ```typescript
 * const createBookingWithRetry = withRetryWrapper(
 *   async (data) => {
 *     return await supabase.from('bookings').insert(data);
 *   },
 *   { maxAttempts: 3 }
 * );
 *
 * const result = await createBookingWithRetry({ customer_id: '...' });
 * ```
 */
export function withRetryWrapper<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const result = await withRetry(() => fn(...args), options);

    if (result.success && result.data !== undefined) {
      return result.data;
    }

    // Throw the error if all retries failed
    throw result.error || new Error('Operation failed after retries');
  };
}

/**
 * Retry configuration profiles for common scenarios
 */
export const RETRY_PROFILES = {
  /**
   * Quick operations that should retry fast (e.g., reading data)
   */
  QUICK: {
    maxAttempts: 3,
    initialDelayMs: 500,
    maxDelayMs: 2000,
    backoffMultiplier: 2,
  } as RetryOptions,

  /**
   * Standard operations with moderate retry policy (e.g., updates)
   */
  STANDARD: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
  } as RetryOptions,

  /**
   * Critical operations that must succeed (e.g., payment processing)
   */
  CRITICAL: {
    maxAttempts: 5,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  } as RetryOptions,

  /**
   * Webhook operations with longer delays (Stripe best practices)
   */
  WEBHOOK: {
    maxAttempts: 3,
    initialDelayMs: 2000,
    maxDelayMs: 8000,
    backoffMultiplier: 2,
  } as RetryOptions,
};

/**
 * Helper function for logging retry attempts
 */
export function createRetryLogger(context: string) {
  return (attempt: number, error: unknown, delayMs: number) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(
      `[${context}] Retry attempt ${attempt} after ${Math.round(delayMs)}ms due to: ${errorMessage}`
    );
  };
}

/**
 * Example usage in webhook:
 *
 * ```typescript
 * import { withRetry, RETRY_PROFILES, createRetryLogger } from "../shared/retry-utils.ts";
 *
 * // In webhook handler
 * const result = await withRetry(
 *   async () => {
 *     return await supabase.from('bookings').insert({
 *       customer_id: userId,
 *       service_id: serviceId,
 *       ...
 *     });
 *   },
 *   {
 *     ...RETRY_PROFILES.WEBHOOK,
 *     onRetry: createRetryLogger(`payment_intent.succeeded:${paymentIntent.id}`)
 *   }
 * );
 *
 * if (!result.success) {
 *   console.error('Failed to create booking after retries:', result.error);
 *   // Alert admin, log to Sentry, etc.
 * }
 * ```
 */
