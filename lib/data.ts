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
    .eq("role", "technician")
    .order("first_name", { ascending: true });

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
  try {
    console.log("Creating service with data:", JSON.stringify(service));

    const { data, error } = await supabase
      .from("services")
      .insert(service)
      .select()
      .single();

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
 * Dashboard and reporting functions
 */
export async function getDashboardMetrics() {
  // Optimized version: single batch query using stored procedure
  const { data, error } = await supabase.rpc("get_dashboard_metrics");

  if (error) throw error;
  return data;
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
 * Utility functions
 */
export function unsubscribeFromChannel(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}
