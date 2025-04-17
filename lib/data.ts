import { supabase } from "./supabase";
import { User } from "@supabase/supabase-js";
import { RealtimeChannel } from "@supabase/supabase-js";
import { queryWithRetry } from "./queryWithRetry";

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

export interface Review {
  id: string;
  booking_id: string;
  customer_id: string;
  technician_id: string;
  rating: number;
  comment?: string;
  created_at?: string;
}

/**
 * Profile related functions
 */
export async function getProfile(userId: string) {
  const { data, error } = await queryWithRetry(() =>
    supabase.from("profiles").select("*").eq("id", userId).single()
  );

  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await queryWithRetry(() =>
    supabase.from("profiles").update(updates).eq("id", userId).select().single()
  );

  if (error) throw error;
  return data as Profile;
}

export async function getTechnicians() {
  const { data, error } = await queryWithRetry(() =>
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "technician")
      .order("first_name", { ascending: true })
  );

  if (error) throw error;
  return data as Profile[];
}

export async function getCustomers() {
  const { data, error } = await queryWithRetry(() =>
    supabase.from("profiles").select("*").eq("role", "customer")
  );

  if (error) throw error;
  return data as Profile[];
}

/**
 * Service related functions
 */
export async function getServices() {
  const { data, error } = await queryWithRetry(() =>
    supabase.from("services").select("*").eq("is_active", true)
  );

  if (error) throw error;
  return data as Service[];
}

export async function getService(serviceId: string) {
  const { data, error } = await queryWithRetry(() =>
    supabase.from("services").select("*").eq("id", serviceId).single()
  );

  if (error) throw error;
  return data as Service;
}

export async function createService(
  service: Omit<Service, "id" | "created_at" | "updated_at">
) {
  try {
    console.log("Creating service with data:", JSON.stringify(service));

    const { data, error } = await queryWithRetry(() =>
      supabase.from("services").insert(service).select().single()
    );

    if (error) {
      console.error("Supabase error creating service:", error);
      throw error;
    }

    console.log("Service created successfully:", data);
    return data as Service;
  } catch (err) {
    console.error("Error in createService function:", err);
    throw err;
  }
}

export async function updateService(
  serviceId: string,
  updates: Partial<Service>
) {
  const { data, error } = await queryWithRetry(() =>
    supabase
      .from("services")
      .update(updates)
      .eq("id", serviceId)
      .select()
      .single()
  );

  if (error) throw error;
  return data as Service;
}

export async function deleteService(serviceId: string) {
  const { error } = await queryWithRetry(() =>
    supabase.from("services").delete().eq("id", serviceId)
  );

  if (error) throw error;
  return true;
}

/**
 * RecurringPlan related functions
 */
export async function getRecurringPlans() {
  const { data, error } = await queryWithRetry(() =>
    supabase.from("recurring_plans").select("*")
  );

  if (error) throw error;
  return data as RecurringPlan[];
}

export async function getRecurringPlan(planId: string) {
  const { data, error } = await queryWithRetry(() =>
    supabase.from("recurring_plans").select("*").eq("id", planId).single()
  );

  if (error) throw error;
  return data as RecurringPlan;
}

export async function createRecurringPlan(
  plan: Omit<RecurringPlan, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await queryWithRetry(() =>
    supabase.from("recurring_plans").insert(plan).select().single()
  );

  if (error) throw error;
  return data as RecurringPlan;
}

export async function updateRecurringPlan(
  planId: string,
  updates: Partial<RecurringPlan>
) {
  const { data, error } = await queryWithRetry(() =>
    supabase
      .from("recurring_plans")
      .update(updates)
      .eq("id", planId)
      .select()
      .single()
  );

  if (error) throw error;
  return data as RecurringPlan;
}

export async function deleteRecurringPlan(planId: string) {
  const { error } = await queryWithRetry(() =>
    supabase.from("recurring_plans").delete().eq("id", planId)
  );

  if (error) throw error;
  return true;
}

/**
 * Review related functions
 */
export async function createReview(review: Omit<Review, "id" | "created_at">) {
  const { data, error } = await queryWithRetry(() =>
    supabase.from("reviews").insert(review).select().single()
  );

  if (error) throw error;
  return data as Review;
}

export async function getTechnicianReviews(technicianId: string) {
  const { data, error } = await queryWithRetry(() =>
    supabase
      .from("reviews")
      .select(
        `*,
        customer:profiles!reviews_customer_id_fkey(*),
        booking:bookings(*, service:services(*))
      `
      )
      .eq("technician_id", technicianId)
      .order("created_at", { ascending: false })
  );

  if (error) throw error;
  return data as any[];
}

export async function getServiceReviews(serviceId: string) {
  const { data, error } = await queryWithRetry(() =>
    supabase
      .from("reviews")
      .select(
        `
      *,
      customer:profiles!reviews_customer_id_fkey(*)
    `
      )
      .eq("service_id", serviceId)
      .order("created_at", { ascending: false })
  );

  if (error) throw error;
  return data as any[];
}

/**
 * Dashboard/Admin related functions
 */
export async function getDashboardMetrics() {
  const calls = [
    queryWithRetry(() => supabase.rpc("get_total_customers")),
    queryWithRetry(() => supabase.rpc("get_total_technicians")),
    queryWithRetry(() => supabase.rpc("get_total_bookings")),
    queryWithRetry(() => supabase.rpc("get_pending_bookings_count")),
  ];

  try {
    const [customers, technicians, bookings, pending] = await Promise.all(
      calls
    );
    return {
      totalCustomers: customers.data,
      totalTechnicians: technicians.data,
      totalBookings: bookings.data,
      pendingBookings: pending.data,
    };
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    throw error;
  }
}

export async function getBookingsByDateRange(
  startDate: string,
  endDate: string
) {
  const { data, error } = await queryWithRetry(() =>
    supabase
      .from("bookings")
      .select("*, customer:profiles!customer_id(*), service:services(*)")
      .gte("scheduled_date", startDate)
      .lte("scheduled_date", endDate)
      .order("scheduled_date", { ascending: true })
  );

  if (error) throw error;
  return data as any[];
}

export async function getRevenueByService() {
  const { data, error } = await queryWithRetry(() =>
    supabase.rpc("calculate_revenue_by_service")
  );

  if (error) {
    console.error("Error fetching revenue by service:", error);
    throw error;
  }
  return data as { service_name: string; total_revenue: number }[];
}

export function unsubscribeFromChannel(channel: RealtimeChannel): void {
  if (channel) {
    supabase.removeChannel(channel);
  }
}
