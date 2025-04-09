export class AppError extends Error {
  public code: string;
  public httpStatus: number;

  constructor(message: string, code: string, httpStatus: number = 400) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
    this.name = "AppError";
  }
}

export class PaymentError extends AppError {
  constructor(message: string, code: string = "payment_error") {
    super(message, code, 400);
    this.name = "PaymentError";
  }
}

/**
 * Centralized error handler for API and database operations
 *
 * @param error - The error object to handle
 * @returns An object with standardized error message and code
 *
 * Usage:
 *   try {
 *     // API or database operation
 *   } catch (error) {
 *     const { error: errorMessage, code } = handleApiError(error);
 *     // Display error to user or handle programmatically
 *   }
 */
export function handleApiError(error: any) {
  console.error("API Error:", error);

  if (error instanceof AppError) {
    return { error: error.message, code: error.code };
  }

  // Handle Supabase specific errors if needed
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    "message" in error
  ) {
    // Basic check for Supabase error structure
    return { error: error.message, code: error.code };
  }

  return {
    error: "An unexpected error occurred",
    code: "unknown_error",
  };
}
