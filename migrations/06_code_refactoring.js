/**
 * Code refactoring examples for data.ts
 * These are code snippets to demonstrate how to implement batch queries and pagination
 */

// ----- EXAMPLE 1: REFACTORED DASHBOARD METRICS -----
// Original version makes multiple separate queries
export async function getDashboardMetrics() {
  // Current implementation: multiple separate queries

  /* REPLACE WITH THE FOLLOWING: */

  // Refactored version: single batch query
  const { data, error } = await supabase.rpc("get_dashboard_metrics");

  if (error) throw error;
  return data;
}

// SQL Function to implement in Supabase (create this via SQL editor):
/*
CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS json AS $$
DECLARE
  total_bookings_count integer;
  completed_bookings_count integer;
  total_revenue numeric;
  customer_count integer;
  avg_rating numeric;
BEGIN
  -- Get total bookings count
  SELECT COUNT(*) INTO total_bookings_count FROM bookings;
  
  -- Get completed bookings count
  SELECT COUNT(*) INTO completed_bookings_count FROM bookings WHERE status = 'completed';
  
  -- Get total revenue
  SELECT COALESCE(SUM(price), 0) INTO total_revenue FROM bookings WHERE status = 'completed';
  
  -- Get customer count
  SELECT COUNT(*) INTO customer_count FROM profiles WHERE role = 'customer';
  
  -- Get average rating
  SELECT COALESCE(AVG(rating), 0) INTO avg_rating FROM reviews;
  
  RETURN json_build_object(
    'totalBookings', total_bookings_count,
    'completedBookings', completed_bookings_count,
    'totalRevenue', total_revenue,
    'customerCount', customer_count,
    'averageRating', avg_rating
  );
END;
$$ LANGUAGE plpgsql;
*/

// ----- EXAMPLE 2: PAGINATION FOR LIST VIEWS -----
// Original version fetches all customer bookings without pagination
export async function getCustomerBookings(customerId) {
  // Current implementation: no pagination

  /* REPLACE WITH THE FOLLOWING: */

  // Option 1: Offset-based pagination (simpler but less efficient for large datasets)
  export async function getCustomerBookings(
    customerId,
    page = 1,
    pageSize = 10
  ) {
    const { data, error, count } = await supabase
      .from("bookings")
      .select(
        `
        *, 
        service:services(*), 
        recurring_plan:recurring_plans(*),
        technician:profiles!bookings_technician_id_fkey(*),
        review:reviews(*)
        `,
        { count: "exact" }
      )
      .eq("customer_id", customerId)
      .order("scheduled_date", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) throw error;
    return { data, totalCount: count };
  }

  // Option 2: Cursor-based pagination (more efficient for large datasets)
  export async function getCustomerBookingsCursor(
    customerId,
    cursor = null,
    pageSize = 10
  ) {
    let query = supabase
      .from("bookings")
      .select(
        `
        *, 
        service:services(*), 
        recurring_plan:recurring_plans(*),
        technician:profiles!bookings_technician_id_fkey(*),
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

    const { data, error } = await query;

    if (error) throw error;

    let hasMore = false;
    let nextCursor = null;

    if (data.length > pageSize) {
      hasMore = true;
      data.pop(); // Remove the extra item
      nextCursor = data[data.length - 1].scheduled_date;
    }

    return { data, hasMore, nextCursor };
  }
}

// ----- EXAMPLE 3: RETRY LOGIC FOR TRANSIENT FAILURES -----
/**
 * Generic function with retry logic for Supabase queries
 */
async function queryWithRetry(queryFn, maxRetries = 3, delay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
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

// Example usage of retry logic
export async function getProfileWithRetry(userId) {
  return queryWithRetry(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  });
}
