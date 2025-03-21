import { supabase } from "./supabase";
import { User } from "@supabase/supabase-js";
import { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Types for the database models
 */
export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: "customer" | "technician" | "admin";
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  profile_image_url?: string;
  stripe_customer_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  base_price: number;
  duration_minutes?: number;
  image_url?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RecurringPlan {
  id: string;
  name: string;
  description?: string;
  frequency: "weekly" | "biweekly" | "monthly";
  discount_percentage: number;
  stripe_price_id?: string;
  created_at?: string;
  updated_at?: string;
}

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

  // Joined data
  service?: Service;
  customer?: Profile;
  technician?: Profile;
  recurring_plan?: RecurringPlan;
  review?: Review;
}

export interface Review {
  id: string;
  booking_id: string;
  customer_id: string;
  technician_id: string;
  rating: number;
  comment?: string;
  created_at?: string;
}

export interface PaymentMethod {
  id: string;
  customer_id: string;
  stripe_payment_method_id: string;
  card_last4?: string;
  card_brand?: string;
  is_default: boolean;
  created_at?: string;
}

/**
 * Notification related types and functions
 */
export interface Notification {
  id: string;
  user_id: string;
  type:
    | "booking_created"
    | "booking_updated"
    | "booking_cancelled"
    | "review_received"
    | "payment_processed"
    | "message";
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

/**
 * Profile related functions
 */
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function getTechnicians() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "technician");

  if (error) throw error;
  return data as Profile[];
}

export async function getCustomers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "customer");

  if (error) throw error;
  return data as Profile[];
}

/**
 * Service related functions
 */
export async function getServices() {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true);

  if (error) throw error;
  return data as Service[];
}

export async function getService(serviceId: string) {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (error) throw error;
  return data as Service;
}

export async function createService(
  service: Omit<Service, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await supabase
    .from("services")
    .insert(service)
    .select()
    .single();

  if (error) throw error;
  return data as Service;
}

export async function updateService(
  serviceId: string,
  updates: Partial<Service>
) {
  const { data, error } = await supabase
    .from("services")
    .update(updates)
    .eq("id", serviceId)
    .select()
    .single();

  if (error) throw error;
  return data as Service;
}

export async function deleteService(serviceId: string) {
  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", serviceId);

  if (error) throw error;
  return true;
}

/**
 * RecurringPlan related functions
 */
export async function getRecurringPlans() {
  const { data, error } = await supabase.from("recurring_plans").select("*");

  if (error) throw error;
  return data as RecurringPlan[];
}

export async function getRecurringPlan(planId: string) {
  const { data, error } = await supabase
    .from("recurring_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (error) throw error;
  return data as RecurringPlan;
}

export async function createRecurringPlan(
  plan: Omit<RecurringPlan, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await supabase
    .from("recurring_plans")
    .insert(plan)
    .select()
    .single();

  if (error) throw error;
  return data as RecurringPlan;
}

export async function updateRecurringPlan(
  planId: string,
  updates: Partial<RecurringPlan>
) {
  const { data, error } = await supabase
    .from("recurring_plans")
    .update(updates)
    .eq("id", planId)
    .select()
    .single();

  if (error) throw error;
  return data as RecurringPlan;
}

export async function deleteRecurringPlan(planId: string) {
  const { error } = await supabase
    .from("recurring_plans")
    .delete()
    .eq("id", planId);

  if (error) throw error;
  return true;
}

/**
 * Booking related functions
 */
export async function getCustomerBookings(customerId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `*, 
      service:service_id(*), 
      recurring_plan:recurring_plan_id(*),
      technician:technician_id(*),
      review:reviews(*)
      `
    )
    .eq("customer_id", customerId);

  if (error) throw error;
  return data as Booking[];
}

/**
 * Get upcoming bookings for a customer
 */
export async function getUpcomingBookings(customerId: string) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const { data, error } = await supabase
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
    .order("scheduled_date", { ascending: true });

  if (error) throw error;
  return data as Booking[];
}

export async function getTechnicianBookings(technicianId: string) {
  const { data, error } = await supabase
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
    .order("scheduled_date", { ascending: true });

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

  const { data, error } = await query.order("scheduled_date", {
    ascending: true,
  });

  if (error) throw error;
  return data as Booking[];
}

export async function getBooking(bookingId: string) {
  const { data, error } = await supabase
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
    .single();

  if (error) throw error;
  return data as Booking;
}

export async function createBooking(
  booking: Omit<Booking, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await supabase
    .from("bookings")
    .insert(booking)
    .select()
    .single();

  if (error) throw error;
  return data as Booking;
}

export async function updateBooking(
  bookingId: string,
  updates: Partial<Booking>
) {
  const { data, error } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", bookingId)
    .select()
    .single();

  if (error) throw error;
  return data as Booking;
}

export async function deleteBooking(bookingId: string) {
  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (error) throw error;
  return true;
}

export async function assignTechnician(
  bookingId: string,
  technicianId: string
) {
  return updateBooking(bookingId, {
    technician_id: technicianId,
    status: "scheduled",
  });
}

export async function updateBookingStatus(
  bookingId: string,
  status: Booking["status"]
) {
  return updateBooking(bookingId, { status });
}

/**
 * Review related functions
 */
export async function createReview(review: Omit<Review, "id" | "created_at">) {
  const { data, error } = await supabase
    .from("reviews")
    .insert(review)
    .select()
    .single();

  if (error) throw error;
  return data as Review;
}

export async function getTechnicianReviews(technicianId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
      *,
      booking:bookings(*),
      customer:profiles!reviews_customer_id_fkey(*)
    `
    )
    .eq("technician_id", technicianId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as (Review & { booking: Booking; customer: Profile })[];
}

export async function getServiceReviews(serviceId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
      *,
      booking:bookings!inner(*),
      customer:profiles!reviews_customer_id_fkey(*)
    `
    )
    .eq("booking.service_id", serviceId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as (Review & { booking: Booking; customer: Profile })[];
}

/**
 * Payment method related functions
 */
export async function getCustomerPaymentMethods(customerId: string) {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("customer_id", customerId)
    .order("is_default", { ascending: false });

  if (error) throw error;
  return data as PaymentMethod[];
}

export async function addPaymentMethod(
  paymentMethod: Omit<PaymentMethod, "id" | "created_at">
) {
  const { data, error } = await supabase
    .from("payment_methods")
    .insert(paymentMethod)
    .select()
    .single();

  if (error) throw error;
  return data as PaymentMethod;
}

export async function setDefaultPaymentMethod(
  paymentMethodId: string,
  customerId: string
) {
  // First, unset default for all customer's payment methods
  const { error: updateError } = await supabase
    .from("payment_methods")
    .update({ is_default: false })
    .eq("customer_id", customerId);

  if (updateError) throw updateError;

  // Then, set default for the specified payment method
  const { data, error } = await supabase
    .from("payment_methods")
    .update({ is_default: true })
    .eq("id", paymentMethodId)
    .eq("customer_id", customerId)
    .select()
    .single();

  if (error) throw error;
  return data as PaymentMethod;
}

export async function removePaymentMethod(paymentMethodId: string) {
  const { error } = await supabase
    .from("payment_methods")
    .delete()
    .eq("id", paymentMethodId);

  if (error) throw error;
  return true;
}

/**
 * Dashboard and reporting functions
 */
export async function getDashboardMetrics() {
  // Get total bookings count
  const { count: totalBookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true });

  if (bookingsError) throw bookingsError;

  // Get completed bookings count
  const { count: completedBookings, error: completedError } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed");

  if (completedError) throw completedError;

  // Get total revenue (sum of completed bookings)
  const { data: revenueData, error: revenueError } = await supabase
    .from("bookings")
    .select("price")
    .eq("status", "completed");

  if (revenueError) throw revenueError;

  const totalRevenue = revenueData.reduce(
    (acc, booking) => acc + booking.price,
    0
  );

  // Get customer count
  const { count: customerCount, error: customerError } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "customer");

  if (customerError) throw customerError;

  // Get average rating
  const { data: ratingData, error: ratingError } = await supabase
    .from("reviews")
    .select("rating");

  if (ratingError) throw ratingError;

  const averageRating =
    ratingData.length > 0
      ? ratingData.reduce((acc, review) => acc + review.rating, 0) /
        ratingData.length
      : 0;

  return {
    totalBookings,
    completedBookings,
    totalRevenue,
    customerCount,
    averageRating,
  };
}

export async function getBookingsByDateRange(
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .gte("scheduled_date", startDate)
    .lte("scheduled_date", endDate)
    .order("scheduled_date", { ascending: true });

  if (error) throw error;
  return data as Booking[];
}

export async function getRevenueByService() {
  const { data, error } = await supabase
    .from("bookings")
    .select("price, service:services!inner(id, name)")
    .eq("status", "completed");

  if (error) throw error;

  // Aggregate revenue by service
  const serviceRevenue: Record<
    string,
    { id: string; name: string; revenue: number }
  > = {};

  // Use a type guard to safely access the service properties
  if (data && Array.isArray(data)) {
    data.forEach((booking) => {
      // Type assertion with safety checks
      const service = booking.service as unknown as {
        id: string;
        name: string;
      };
      if (
        service &&
        typeof service === "object" &&
        "id" in service &&
        "name" in service
      ) {
        const serviceId = service.id;
        if (!serviceRevenue[serviceId]) {
          serviceRevenue[serviceId] = {
            id: serviceId,
            name: service.name,
            revenue: 0,
          };
        }
        // Ensure price is a number
        serviceRevenue[serviceId].revenue += Number(booking.price) || 0;
      }
    });
  }

  return Object.values(serviceRevenue);
}

/**
 * Real-time Subscriptions
 */

// Subscribe to bookings with optional filters
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

// Subscribe to profile changes (useful for admin dashboards)
export function subscribeToProfiles(
  callback: (payload: any) => void,
  userId?: string
): RealtimeChannel {
  const channel = supabase
    .channel("profiles-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "profiles",
        filter: userId ? `id=eq.${userId}` : undefined,
      },
      (payload) => {
        console.log("Received profile update:", payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log("Profiles subscription status:", status);
    });

  return channel;
}

// Subscribe to reviews (useful for technicians and customers)
export function subscribeToReviews(
  callback: (payload: any) => void,
  filters?: { customerId?: string; technicianId?: string; bookingId?: string }
): RealtimeChannel {
  // Building the filter condition
  let filterCondition = "";

  if (filters?.customerId) {
    filterCondition = `customer_id=eq.${filters.customerId}`;
  } else if (filters?.technicianId) {
    filterCondition = `technician_id=eq.${filters.technicianId}`;
  } else if (filters?.bookingId) {
    filterCondition = `booking_id=eq.${filters.bookingId}`;
  }

  const channel = supabase
    .channel("reviews-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "reviews",
        filter: filterCondition || undefined,
      },
      (payload) => {
        console.log("Received review update:", payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log("Reviews subscription status:", status);
    });

  return channel;
}

// Helper function to unsubscribe from all channels
export function unsubscribeFromChannel(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}

/**
 * Get user notifications
 * @param includeRead Whether to include read notifications (defaults to false)
 * @returns List of notifications
 */
export async function getNotifications(includeRead = false) {
  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (!includeRead) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Notification[];
}

/**
 * Get unread notifications count
 * @returns Count of unread notifications
 */
export async function getUnreadNotificationsCount() {
  const { data, error } = await supabase.rpc("get_unread_notifications_count");

  if (error) throw error;
  return data as number;
}

/**
 * Mark a notification as read
 * @param notificationId ID of the notification to mark
 * @returns Success status
 */
export async function markNotificationRead(notificationId: string) {
  const { data, error } = await supabase.rpc("mark_notification_read", {
    p_notification_id: notificationId,
  });

  if (error) throw error;
  return data as boolean;
}

/**
 * Mark all notifications as read
 * @returns Success status
 */
export async function markAllNotificationsRead() {
  const { data, error } = await supabase.rpc("mark_all_notifications_read");

  if (error) throw error;
  return data as boolean;
}

/**
 * Create a notification manually (for testing or admin purposes)
 * @param userId User ID to notify
 * @param type Notification type
 * @param title Notification title
 * @param message Notification message
 * @param data Optional data payload
 * @returns The created notification ID
 */
export async function createNotification(
  userId: string,
  type: Notification["type"],
  title: string,
  message: string,
  data?: any
) {
  const { data: notificationId, error } = await supabase.rpc(
    "create_notification",
    {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_message: message,
      p_data: data ? JSON.stringify(data) : null,
    }
  );

  if (error) throw error;
  return notificationId as string;
}

/**
 * Subscribe to notifications for the current user
 * @param callback Function to call when notifications are received
 * @returns The subscription channel
 */
export function subscribeToNotifications(callback: (payload: any) => void) {
  // Get the current user id
  const userId = supabase.auth
    .getSession()
    .then(({ data }) => data.session?.user.id);

  const channel = supabase
    .channel("notifications-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log("Received notification:", payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log("Notifications subscription status:", status);
    });

  return channel;
}
