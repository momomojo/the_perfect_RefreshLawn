// Dedicated module for booking-related operations
// (e.g., creating, updating, fetching bookings, handling status transitions)

import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { Profile, Service, RecurringPlan, Review } from "./data"; // Import dependent types from data.ts
import { queryWithRetry } from "./queryWithRetry"; // Import retry utility

// Helper function for validation
function validateBookingData(data: Partial<Booking>, isUpdate = false) {
  const errors: string[] = [];

  // Required fields for create
  if (!isUpdate) {
    if (!data.customer_id) errors.push("Customer ID is required.");
    if (!data.service_id) errors.push("Service ID is required.");
    if (!data.status) errors.push("Booking status is required.");
    if (data.price === undefined || data.price === null) {
      errors.push("Price is required.");
    } else if (data.price <= 0) {
      errors.push("Price must be a positive number.");
    }
    if (!data.scheduled_date) {
      errors.push("Scheduled date is required.");
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.scheduled_date)) {
      errors.push("Scheduled date must be in YYYY-MM-DD format.");
    }
    if (!data.scheduled_time) {
      errors.push("Scheduled time is required.");
    } else if (!/^\d{2}:\d{2}$/.test(data.scheduled_time)) {
      // Basic HH:MM format check
      errors.push("Scheduled time must be in HH:MM format.");
    }
  }

  // Checks for update (only if fields are present)
  if (isUpdate) {
    if (data.price !== undefined && data.price <= 0) {
      errors.push("Price must be a positive number.");
    }
    if (
      data.scheduled_date &&
      !/^\d{4}-\d{2}-\d{2}$/.test(data.scheduled_date)
    ) {
      errors.push("Scheduled date must be in YYYY-MM-DD format.");
    }
    if (data.scheduled_time && !/^\d{2}:\d{2}$/.test(data.scheduled_time)) {
      errors.push("Scheduled time must be in HH:MM format.");
    }
  }

  // Check status value if present
  if (data.status) {
    const validStatuses = [
      "pending",
      "scheduled",
      "in_progress",
      "completed",
      "cancelled",
      "payment_failed",
      "rescheduled", // Add any other valid statuses
    ];
    if (!validStatuses.includes(data.status)) {
      errors.push(`Invalid status: ${data.status}.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Booking validation failed: ${errors.join(" ")}`);
  }
}

export {}; // Add export to make it a module

/**
 * Booking Interface (Moved from data.ts)
 */
export interface Booking {
  id: string;
  customer_id: string;
  technician_id?: string;
  service_id: string;
  recurring_plan_id?: string;
  status: "pending" | "scheduled" | "in_progress" | "completed" | "cancelled";
  price: number;
  scheduled_date: string;
  scheduled_time: string;
  address?: string;
  notes?: string;
  stripe_payment_intent_id?: string;
  stripe_subscription_id?: string;
  created_at?: string;
  updated_at?: string;

  // Joined data (Keep using types from data.ts for now)
  service?: Service;
  customer?: Profile;
  technician?: Profile;
  recurring_plan?: RecurringPlan;
  review?: Review;
}

/**
 * Booking related functions (Moved from data.ts)
 */
export async function getCustomerBookings(
  customerId: string,
  page = 1,
  pageSize = 10
) {
  // Wrap the Supabase query with retry logic
  const { data, error, count } = await queryWithRetry(() =>
    supabase
      .from("bookings")
      .select(
        `*,
        service:service_id(*),
        recurring_plan:recurring_plan_id(*),
        technician:technician_id(*),
        review:reviews(*)
        `,
        { count: "exact" }
      )
      .eq("customer_id", customerId)
      .order("scheduled_date", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)
  );

  if (error) throw error;
  return { data, totalCount: count } as { data: Booking[]; totalCount: number };
}

/**
 * Cursor-based pagination alternative for larger datasets
 */
export async function getCustomerBookingsCursor(
  customerId: string,
  cursor: string | null = null,
  pageSize = 10
) {
  let query = supabase
    .from("bookings")
    .select(
      `*,
      service:service_id(*),
      recurring_plan:recurring_plan_id(*),
      technician:technician_id(*),
      review:reviews(*)
      `
    )
    .eq("customer_id", customerId)
    .order("scheduled_date", { ascending: false })
    .limit(pageSize + 1); // request one extra to serve as next cursor

  if (cursor) {
    // Apply cursor filter
    query = query.lt("scheduled_date", cursor);
  }

  // Wrap the Supabase query with retry logic
  const { data, error } = await queryWithRetry(() => query);

  if (error) throw error;

  let hasMore = false;
  let nextCursor = null;

  if (data && data.length > pageSize) {
    hasMore = true;
    data.pop(); // Remove the extra item
    nextCursor = data[data.length - 1].scheduled_date;
  }

  return {
    data: data as Booking[],
    hasMore,
    nextCursor,
  };
}

/**
 * Get upcoming bookings for a customer
 */
export async function getUpcomingBookings(customerId: string) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Wrap the Supabase query with retry logic
  const { data, error } = await queryWithRetry(() =>
    supabase
      .from("bookings")
      .select(
        `*,
        service:service_id(*),
        recurring_plan:recurring_plan_id(*),
        technician:technician_id(*),
        review:reviews(*)`
      )
      .eq("customer_id", customerId)
      .gte("scheduled_date", today)
      .order("scheduled_date", { ascending: true })
  );

  if (error) throw error;
  return data as Booking[];
}

export async function getTechnicianBookings(technicianId: string) {
  // Wrap the Supabase query with retry logic
  const { data, error } = await queryWithRetry(() =>
    supabase
      .from("bookings")
      .select(
        `
      *,
      service:services(*),
      customer:profiles!bookings_customer_id_fkey(*),
      recurring_plan:recurring_plans(*)
    `
      )
      .eq("technician_id", technicianId)
      .order("scheduled_date", { ascending: true })
  );

  if (error) throw error;
  return data as Booking[];
}

export async function getAllBookings(filters?: {
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  let query = supabase.from("bookings").select(`
      *,
      service:services(*),
      customer:profiles!bookings_customer_id_fkey(*),
      technician:profiles!bookings_technician_id_fkey(*),
      recurring_plan:recurring_plans(*)
    `);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.startDate) {
    query = query.gte("scheduled_date", filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte("scheduled_date", filters.endDate);
  }

  // Wrap the Supabase query with retry logic
  const { data, error } = await queryWithRetry(() =>
    query.order("scheduled_date", { ascending: true })
  );

  if (error) throw error;
  return data as Booking[];
}

export async function getBooking(bookingId: string) {
  // Wrap the Supabase query with retry logic
  const { data, error } = await queryWithRetry(() =>
    supabase
      .from("bookings")
      .select(
        `
      *,
      service:services(*),
      customer:profiles!bookings_customer_id_fkey(*),
      technician:profiles!bookings_technician_id_fkey(*),
      recurring_plan:recurring_plans(*),
      review:reviews(*)
    `
      )
      .eq("id", bookingId)
      .single()
  );

  if (error) throw error;
  return data as Booking;
}

export async function createBooking(
  booking: Omit<Booking, "id" | "created_at" | "updated_at">
) {
  // Add validation before inserting
  validateBookingData(booking);

  // Wrap the Supabase query with retry logic
  const { data, error } = await queryWithRetry(() =>
    supabase.from("bookings").insert(booking).select().single()
  );

  if (error) throw error;
  return data as Booking;
}

export async function updateBooking(
  bookingId: string,
  updates: Partial<Booking>
) {
  if (!bookingId) {
    throw new Error("Booking ID is required for update.");
  }
  if (Object.keys(updates).length === 0) {
    throw new Error("No updates provided.");
  }

  // Add validation before updating
  validateBookingData(updates, true);

  // Prevent updating immutable fields if necessary (example)
  delete updates.id; // Cannot update ID
  delete updates.customer_id; // Usually shouldn't change customer
  delete updates.created_at; // Cannot update created_at

  // Wrap the Supabase query with retry logic
  const { data, error } = await queryWithRetry(() =>
    supabase
      .from("bookings")
      .update({ ...updates, updated_at: new Date().toISOString() }) // Ensure updated_at is set
      .eq("id", bookingId)
      .select()
      .single()
  );

  if (error) throw error;
  return data as Booking;
}

export async function deleteBooking(bookingId: string) {
  // Wrap the Supabase query with retry logic
  const { error } = await queryWithRetry(() =>
    supabase.from("bookings").delete().eq("id", bookingId)
  );

  if (error) throw error;
  return true;
}

export async function assignTechnician(
  bookingId: string,
  technicianId: string
) {
  try {
    // First try to use the new RPC function
    // Wrap the Supabase query with retry logic
    const { data, error } = await queryWithRetry(() =>
      supabase.rpc("assign_booking_technician", {
        p_booking_id: bookingId,
        p_technician_id: technicianId,
      })
    );

    if (error) {
      console.error("Error assigning technician with RPC:", error);
      // Fallback to direct update if RPC fails or doesn't exist
      console.log("Falling back to direct update for assignTechnician");
      // Wrap the fallback Supabase query with retry logic
      const { data: updateData, error: updateError } = await queryWithRetry(
        () =>
          supabase
            .from("bookings")
            .update({
              technician_id: technicianId,
              status: "scheduled", // Assuming assigning means scheduling
              updated_at: new Date().toISOString(),
            })
            .eq("id", bookingId)
            .select()
            .single()
      );

      if (updateError) throw updateError;
      return updateData as Booking;
    }
    // If RPC succeeded, we might need to refetch the booking if the RPC doesn't return it
    // Since our RPC returns VOID, we refetch
    return await getBooking(bookingId);
  } catch (err) {
    console.error("Assign technician failed:", err);
    throw err;
  }
}

export async function updateBookingStatus(
  bookingId: string,
  status: Booking["status"],
  userId?: string // Pass the user ID performing the action for the RPC check
) {
  try {
    // First try to use the new RPC function
    // Wrap the Supabase query with retry logic
    const { error } = await queryWithRetry(() =>
      supabase.rpc("update_booking_status", {
        p_booking_id: bookingId,
        p_new_status: status,
        p_user_id: userId, // Pass user ID to RPC
      })
    );

    if (error) {
      console.error("Error updating booking status with RPC:", error);
      // Fallback to direct update if RPC fails
      console.log("Falling back to direct update for updateBookingStatus");
      // Wrap the fallback Supabase query with retry logic
      const { data: updateData, error: updateError } = await queryWithRetry(
        () =>
          supabase
            .from("bookings")
            .update({ status: status, updated_at: new Date().toISOString() })
            .eq("id", bookingId)
            .select()
            .single()
      );

      if (updateError) throw updateError;
      return updateData as Booking;
    }
    // If RPC succeeded, we might need to refetch the booking if the RPC doesn't return it
    // Since our RPC returns VOID, we refetch
    return await getBooking(bookingId);
  } catch (err) {
    console.error("Update booking status failed:", err);
    throw err;
  }
}

// Moved subscribeToBookings function here
export function subscribeToBookings(
  callback: (payload: any) => void,
  filters?: { customerId?: string; technicianId?: string; status?: string }
): RealtimeChannel {
  // Building the filter condition
  let filterCondition = "";

  if (filters?.customerId) {
    filterCondition = `customer_id=eq.${filters.customerId}`;
  } else if (filters?.technicianId) {
    filterCondition = `technician_id=eq.${filters.technicianId}`;
  }

  if (filters?.status) {
    filterCondition = filterCondition
      ? `${filterCondition}:and:status=eq.${filters.status}`
      : `status=eq.${filters.status}`;
  }

  console.log(
    "Setting up bookings subscription with filter:",
    filterCondition || "none"
  );

  const channel = supabase
    .channel("bookings-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bookings",
        filter: filterCondition || undefined,
      },
      (payload) => {
        console.log("Received booking update:", payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log("Bookings subscription status:", status);
    });

  return channel;
}
