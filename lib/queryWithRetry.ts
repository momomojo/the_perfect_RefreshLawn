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
      // Only retry on network errors or 5xx server errors
      const isRetryable =
        !error.code || // Network error
        (error.code >= 500 && error.code < 600); // Server error

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      lastError = error;
      console.log(`Retry attempt ${attempt} after error: ${error.message}`);

      // Wait before retrying (with exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, delay * Math.pow(2, attempt - 1))
      );
    }
  }

  throw lastError;
}
