import { Dispatch, SetStateAction } from "react";

/**
 * Optimistic Update Utility
 *
 * Provides helpers for implementing optimistic UI updates that immediately
 * reflect changes in the UI before server confirmation, with automatic rollback
 * on errors.
 */

export interface OptimisticUpdateConfig<T> {
  /** Current state value */
  currentState: T;
  /** State setter function */
  setState: Dispatch<SetStateAction<T>>;
  /** Optimistic value to set immediately */
  optimisticValue: T;
  /** Async operation to perform */
  operation: () => Promise<T | void>;
  /** Optional callback on success */
  onSuccess?: (result: T | void) => void;
  /** Optional callback on error */
  onError?: (error: Error) => void;
  /** Optional custom error message */
  errorMessage?: string;
}

/**
 * Performs an optimistic update with automatic rollback on error
 *
 * @example
 * await optimisticUpdate({
 *   currentState: bookings,
 *   setState: setBookings,
 *   optimisticValue: [...bookings, newBooking],
 *   operation: async () => {
 *     const result = await createBooking(data);
 *     return result;
 *   },
 *   onError: (error) => console.error("Booking creation failed:", error)
 * });
 */
export async function optimisticUpdate<T>(
  config: OptimisticUpdateConfig<T>
): Promise<void> {
  const {
    currentState,
    setState,
    optimisticValue,
    operation,
    onSuccess,
    onError,
    errorMessage = "Operation failed",
  } = config;

  // Store original state for rollback
  const originalState = currentState;

  try {
    console.log("[OptimisticUpdate] Applying optimistic value");

    // 1. Immediately update UI with optimistic value
    setState(optimisticValue);

    // 2. Perform the actual operation
    const result = await operation();

    console.log("[OptimisticUpdate] Operation succeeded");

    // 3. On success, update with server response (if provided)
    if (result !== undefined) {
      setState(result as T);
    }

    // 4. Call success callback
    if (onSuccess) {
      onSuccess(result);
    }
  } catch (error) {
    console.error(`[OptimisticUpdate] ${errorMessage}:`, error);

    // Rollback to original state on error
    setState(originalState);

    // Call error callback
    if (onError && error instanceof Error) {
      onError(error);
    }

    // Re-throw error for caller to handle
    throw error;
  }
}

/**
 * Helper for optimistic array item addition
 *
 * @example
 * await optimisticArrayAdd({
 *   currentArray: bookings,
 *   setArray: setBookings,
 *   newItem: newBooking,
 *   operation: () => createBooking(data),
 *   position: 'start' // or 'end'
 * });
 */
export async function optimisticArrayAdd<T>(config: {
  currentArray: T[];
  setArray: Dispatch<SetStateAction<T[]>>;
  newItem: T;
  operation: () => Promise<T | void>;
  position?: "start" | "end";
  onSuccess?: (result: T | void) => void;
  onError?: (error: Error) => void;
}): Promise<void> {
  const {
    currentArray,
    setArray,
    newItem,
    operation,
    position = "start",
    onSuccess,
    onError,
  } = config;

  const optimisticArray =
    position === "start"
      ? [newItem, ...currentArray]
      : [...currentArray, newItem];

  await optimisticUpdate({
    currentState: currentArray,
    setState: setArray,
    optimisticValue: optimisticArray,
    operation,
    onSuccess,
    onError,
    errorMessage: "Failed to add item",
  });
}

/**
 * Helper for optimistic array item update
 *
 * @example
 * await optimisticArrayUpdate({
 *   currentArray: bookings,
 *   setArray: setBookings,
 *   itemId: bookingId,
 *   updates: { status: 'completed' },
 *   operation: () => updateBookingStatus(bookingId, 'completed'),
 *   getId: (booking) => booking.id
 * });
 */
export async function optimisticArrayUpdate<T>(config: {
  currentArray: T[];
  setArray: Dispatch<SetStateAction<T[]>>;
  itemId: string;
  updates: Partial<T>;
  operation: () => Promise<T | void>;
  getId?: (item: T) => string;
  onSuccess?: (result: T | void) => void;
  onError?: (error: Error) => void;
}): Promise<void> {
  const {
    currentArray,
    setArray,
    itemId,
    updates,
    operation,
    getId = (item: any) => item.id,
    onSuccess,
    onError,
  } = config;

  const optimisticArray = currentArray.map((item) =>
    getId(item) === itemId ? { ...item, ...updates } : item
  );

  await optimisticUpdate({
    currentState: currentArray,
    setState: setArray,
    optimisticValue: optimisticArray,
    operation,
    onSuccess,
    onError,
    errorMessage: "Failed to update item",
  });
}

/**
 * Helper for optimistic array item removal
 *
 * @example
 * await optimisticArrayRemove({
 *   currentArray: bookings,
 *   setArray: setBookings,
 *   itemId: bookingId,
 *   operation: () => deleteBooking(bookingId),
 *   getId: (booking) => booking.id
 * });
 */
export async function optimisticArrayRemove<T>(config: {
  currentArray: T[];
  setArray: Dispatch<SetStateAction<T[]>>;
  itemId: string;
  operation: () => Promise<void>;
  getId?: (item: T) => string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}): Promise<void> {
  const {
    currentArray,
    setArray,
    itemId,
    operation,
    getId = (item: any) => item.id,
    onSuccess,
    onError,
  } = config;

  const optimisticArray = currentArray.filter(
    (item) => getId(item) !== itemId
  );

  await optimisticUpdate({
    currentState: currentArray,
    setState: setArray,
    optimisticValue: optimisticArray,
    operation,
    onSuccess,
    onError,
    errorMessage: "Failed to remove item",
  });
}

/**
 * Helper for optimistic single value update
 *
 * @example
 * await optimisticValueUpdate({
 *   currentValue: user,
 *   setValue: setUser,
 *   optimisticValue: { ...user, name: newName },
 *   operation: () => updateUserProfile(newName)
 * });
 */
export async function optimisticValueUpdate<T>(config: {
  currentValue: T;
  setValue: Dispatch<SetStateAction<T>>;
  optimisticValue: T;
  operation: () => Promise<T | void>;
  onSuccess?: (result: T | void) => void;
  onError?: (error: Error) => void;
}): Promise<void> {
  const {
    currentValue,
    setValue,
    optimisticValue,
    operation,
    onSuccess,
    onError,
  } = config;

  await optimisticUpdate({
    currentState: currentValue,
    setState: setValue,
    optimisticValue,
    operation,
    onSuccess,
    onError,
    errorMessage: "Failed to update value",
  });
}
