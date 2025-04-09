/**
 * Generic function with retry logic for Supabase queries
 * Used to add resilience to operations that might fail due to transient network issues
 */
export async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error: any) {
      // Enhanced check for retryable errors based on feedback
      const isRetryable =
        !error.code || // Network error (no code often means network level failure)
        (typeof error.code === "number" &&
          error.code >= 500 &&
          error.code < 600) || // Server error (numeric code)
        (typeof error.code === "string" &&
          error.code.toLowerCase().includes("timeout")) || // Timeout errors by code
        (error.message && // Check common network error messages
          (error.message.toLowerCase().includes("network") ||
            error.message.toLowerCase().includes("timeout") ||
            error.message.toLowerCase().includes("connection") ||
            error.message.toLowerCase().includes("failed to fetch"))); // Common browser network error

      if (!isRetryable) {
        console.warn(
          `Non-retryable error encountered: ${error.message} (Code: ${error.code})`
        );
        throw error;
      }

      lastError = error;
      // Enhanced logging for retries
      console.log(
        `Retry attempt ${attempt}/${maxRetries} after error: ${
          error.message
        } (Code: ${error.code || "N/A"})`
      );

      if (attempt === maxRetries) {
        console.warn(
          `Maximum retries (${maxRetries}) reached for operation. Giving up.`
        );
        throw lastError; // Throw the last captured error after max retries
      }

      // Wait before retrying (with exponential backoff)
      const backoffDelay = delay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  // This line should theoretically not be reached due to the throw in the loop,
  // but throwing here ensures a value is always returned or an error thrown.
  throw lastError;
}
