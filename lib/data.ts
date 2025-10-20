import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Types for the database models
 */
export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: 'customer' | 'technician' | 'admin';
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  profile_image_url?: string;
  stripe_customer_id?: string;

  // Technician settings (Phase 1 - Email notifications)
  auto_send_job_reports?: boolean;

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
  frequency: 'weekly' | 'biweekly' | 'monthly';
  discount_percentage: number;
  stripe_price_id?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Legacy Booking status - single field that conflates payment and workflow states.
 * @deprecated Use payment_status and workflow_status instead for new code.
 * Maintained for backward compatibility during migration.
 */
export type BookingStatus =
  | 'pending'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'pending_payment'
  | 'payment_processing'
  | 'payment_confirmed'
  | 'payment_failed'
  | 'payment_refunded'
  | 'refunded'
  | 'rescheduled'
  | 'no_show';

/**
 * Payment Status - tracks payment state independently from workflow.
 * Allows bookings to have concurrent states like payment_confirmed + scheduled.
 *
 * - pending: Awaiting payment
 * - processing: Payment is being processed
 * - confirmed: Payment successful
 * - failed: Payment attempt failed
 * - refunded: Payment was refunded
 */
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'confirmed'
  | 'failed'
  | 'refunded';

/**
 * Workflow Status - tracks work state independently from payment.
 * Allows bookings to have concurrent states like payment_confirmed + in_progress.
 *
 * - pending_assignment: Needs technician assignment
 * - scheduled: Technician assigned, awaiting service date
 * - in_progress: Service is being performed
 * - completed: Service finished
 * - cancelled: Booking cancelled
 */
export type WorkflowStatus =
  | 'pending_assignment'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface Booking {
  id: string;
  customer_id: string;
  technician_id?: string;
  service_id: string;
  recurring_plan_id?: string;

  // Legacy status field (deprecated, use payment_status and workflow_status instead)
  status: BookingStatus;

  // Hybrid status fields (Phase 1 implementation)
  payment_status: PaymentStatus;
  workflow_status: WorkflowStatus;

  // Email tracking fields
  report_email_sent: boolean;
  report_email_sent_at?: string | null;
  report_email_sent_by?: string | null;

  price: number;
  scheduled_date: string;
  scheduled_time: string;
  address?: string;
  notes?: string;
  report_notes?: string | null;
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

  // Added for Job Reports Tab
  beforePhotos?: { id?: string; uri: string }[];
  afterPhotos?: { id?: string; uri: string }[];
}

export interface Review {
  id: string;
  booking_id: string;
  customer_id: string;
  technician_id: string;
  rating: number;
  comment?: string;
  admin_feedback?: boolean;
  admin_reviewed?: boolean;
  admin_reviewed_at?: string;
  admin_reviewed_by?: string;
  admin_notes?: string;
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
 * Saved Property related types and functions
 */
export interface SavedProperty {
  id: string;
  customer_id: string;
  nickname: string;
  address: string;
  city?: string;
  state?: string;
  zip_code?: string;
  property_size?: string; // small, medium, large, extra_large
  area_type?: string; // front_yard, back_yard, both
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Notification related types and functions
 */
export interface Notification {
  id: string;
  user_id: string;
  type:
    | 'booking_created'
    | 'booking_updated'
    | 'booking_cancelled'
    | 'booking_completed'
    | 'review_received'
    | 'payment_processed'
    | 'message';
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
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function getTechnicians() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'technician')
    .order('first_name', { ascending: true });

  if (error) throw error;
  return data as Profile[];
}

export async function getCustomers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'customer');

  if (error) throw error;
  return data as Profile[];
}

/**
 * Service related functions
 */
export async function getServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true);

  if (error) throw error;
  return data as Service[];
}

export async function getService(serviceId: string) {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .single();

  if (error) throw error;
  return data as Service;
}

export async function createService(
  service: Omit<Service, 'id' | 'created_at' | 'updated_at'>
) {
  try {
    console.log('Creating service with data:', JSON.stringify(service));

    const { data, error } = await supabase
      .from('services')
      .insert(service)
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating service:', error);
      throw error;
    }

    console.log('Service created successfully:', data);
    return data as Service;
  } catch (err) {
    console.error('Error in createService function:', err);
    throw err;
  }
}

export async function updateService(
  serviceId: string,
  updates: Partial<Service>
) {
  const { data, error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', serviceId)
    .select()
    .single();

  if (error) throw error;
  return data as Service;
}

export async function deleteService(serviceId: string) {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId);

  if (error) throw error;
  return true;
}

/**
 * RecurringPlan related functions
 */
export async function getRecurringPlans() {
  const { data, error } = await supabase.from('recurring_plans').select('*');

  if (error) throw error;
  return data as RecurringPlan[];
}

export async function getRecurringPlan(planId: string) {
  const { data, error } = await supabase
    .from('recurring_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error) throw error;
  return data as RecurringPlan;
}

export async function createRecurringPlan(
  plan: Omit<RecurringPlan, 'id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('recurring_plans')
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
    .from('recurring_plans')
    .update(updates)
    .eq('id', planId)
    .select()
    .single();

  if (error) throw error;
  return data as RecurringPlan;
}

export async function deleteRecurringPlan(planId: string) {
  const { error } = await supabase
    .from('recurring_plans')
    .delete()
    .eq('id', planId);

  if (error) throw error;
  return true;
}

/**
 * Booking related functions
 */
export async function getCustomerBookings(
  customerId: string,
  page = 1,
  pageSize = 10
) {
  const { data, error, count } = await supabase
    .from('bookings')
    .select(
      `*, 
      service:service_id(*), 
      recurring_plan:recurring_plan_id(*),
      technician:technician_id(*),
      review:reviews(*)
      `,
      { count: 'exact' }
    )
    .eq('customer_id', customerId)
    .order('scheduled_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

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
    .from('bookings')
    .select(
      `*, 
      service:service_id(*), 
      recurring_plan:recurring_plan_id(*),
      technician:technician_id(*),
      review:reviews(*)
      `
    )
    .eq('customer_id', customerId)
    .order('scheduled_date', { ascending: false })
    .limit(pageSize + 1); // request one extra to serve as next cursor

  if (cursor) {
    // Apply cursor filter
    query = query.lt('scheduled_date', cursor);
  }

  const { data, error } = await query;

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
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const { data, error } = await supabase
    .from('bookings')
    .select(
      `*, 
      service:service_id(*), 
      recurring_plan:recurring_plan_id(*),
      technician:technician_id(*),
      review:reviews(*)`
    )
    .eq('customer_id', customerId)
    .gte('scheduled_date', today)
    .order('scheduled_date', { ascending: true });

  if (error) throw error;
  return data as Booking[];
}

export async function getTechnicianBookings(technicianId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      *,
      service:services(*),
      customer:profiles!bookings_customer_id_fkey(*),
      recurring_plan:recurring_plans(*)
    `
    )
    .eq('technician_id', technicianId)
    .order('scheduled_date', { ascending: true });

  if (error) throw error;
  return data as Booking[];
}

export async function getAllBookings(filters?: {
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  let query = supabase.from('bookings').select(`
      *,
      service:services(*),
      customer:profiles!bookings_customer_id_fkey(*),
      technician:profiles!bookings_technician_id_fkey(*),
      recurring_plan:recurring_plans(*)
    `);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.startDate) {
    query = query.gte('scheduled_date', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('scheduled_date', filters.endDate);
  }

  const { data, error } = await query.order('scheduled_date', {
    ascending: true,
  });

  if (error) throw error;
  return data as Booking[];
}

export async function getBooking(bookingId: string) {
  const { data, error } = await supabase
    .from('bookings')
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
    .eq('id', bookingId)
    .single();

  if (error) throw error;
  return data as Booking;
}

export async function updateBooking(
  bookingId: string,
  updates: Partial<Booking>
) {
  const { data, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;
  return data as Booking;
}

export async function deleteBooking(bookingId: string) {
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', bookingId);

  if (error) throw error;
  return true;
}

export async function assignTechnician(
  bookingId: string,
  technicianId: string
) {
  try {
    // First try to use the new RPC function
    const { data, error } = await supabase.rpc('assign_booking_technician', {
      p_booking_id: bookingId,
      p_technician_id: technicianId,
    });

    if (error) {
      console.warn(
        'RPC assign_booking_technician failed, falling back to direct update:',
        error
      );
      // Fall back to direct update if RPC isn't available yet
      await updateBooking(bookingId, {
        technician_id: technicianId,
        status: 'scheduled',
      });
      return getBooking(bookingId);
    }

    // If RPC was successful, fetch the updated booking
    return getBooking(bookingId);
  } catch (err) {
    console.error('Error assigning technician:', err);
    throw err;
  }
}

export async function updateBookingStatus(
  bookingId: string,
  status: Booking['status'],
  userId: string,
  reportNotes?: string // <-- Add this optional parameter
) {
  try {
    console.log('[updateBookingStatus] Params:', {
      p_booking_id: bookingId,
      p_new_status: status,
      p_user_id: userId,
      p_report_notes: reportNotes, // <-- Add this for logging
    });
    // Update status and report notes via RPC
    const { data, error } = await supabase.rpc('update_booking_status', {
      p_booking_id: bookingId,
      p_new_status: status,
      p_user_id: userId,
      p_report_notes: reportNotes,
    });

    if (error) {
      console.error('[updateBookingStatus] RPC error:', error);
      throw error;
    }

    // If RPC was successful, fetch the updated booking
    return getBooking(bookingId);
  } catch (err) {
    console.error('[updateBookingStatus] Exception:', err);
    throw err;
  }
}

/**
 * Review related functions
 */
export async function createReview(review: Omit<Review, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('reviews')
    .insert(review)
    .select()
    .single();

  if (error) throw error;
  return data as Review;
}

export async function getTechnicianReviews(technicianId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select(
      `
      *,
      booking:bookings(*),
      customer:profiles!reviews_customer_id_fkey(*)
    `
    )
    .eq('technician_id', technicianId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as (Review & { booking: Booking; customer: Profile })[];
}

export async function getServiceReviews(serviceId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select(
      `
      *,
      booking:bookings!inner(*),
      customer:profiles!reviews_customer_id_fkey(*)
    `
    )
    .eq('booking.service_id', serviceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as (Review & { booking: Booking; customer: Profile })[];
}

/**
 * Admin Feedback Review Functions
 */

/**
 * Get all reviews flagged for admin attention
 * @param includeReviewed Whether to include already-reviewed feedback
 * @returns Reviews with customer and booking details
 */
export async function getAdminFeedbackReviews(includeReviewed = false) {
  let query = supabase
    .from('reviews')
    .select(
      `
      *,
      booking:bookings(
        *,
        service:services(*)
      ),
      customer:profiles!reviews_customer_id_fkey(*),
      technician:profiles!reviews_technician_id_fkey(*),
      reviewer:profiles!reviews_admin_reviewed_by_fkey(*)
    `
    )
    .eq('admin_feedback', true)
    .order('created_at', { ascending: false });

  if (!includeReviewed) {
    query = query.eq('admin_reviewed', false);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as (Review & {
    booking: Booking & { service: Service };
    customer: Profile;
    technician: Profile;
    reviewer?: Profile;
  })[];
}

/**
 * Update a review with admin feedback details
 * @param bookingId The booking ID associated with the review
 * @param feedback The customer's detailed feedback text
 */
export async function updateReviewWithFeedback(
  bookingId: string,
  feedback: string
) {
  // First, verify the review exists
  const { data: existing, error: fetchError } = await supabase
    .from('reviews')
    .select('id, admin_feedback')
    .eq('booking_id', bookingId)
    .maybeSingle(); // Won't crash if 0 rows, returns null instead

  if (fetchError) throw fetchError;

  if (!existing) {
    throw new Error(
      `No review found for booking ${bookingId}. Review must be created before adding feedback.`
    );
  }

  // Now safely update the review
  const { data, error } = await supabase
    .from('reviews')
    .update({
      comment: feedback,
      // admin_feedback is already true from creation (Fix #1)
      // But we'll update it anyway for backwards compatibility
      admin_feedback: true,
    })
    .eq('booking_id', bookingId)
    .select()
    .single(); // Safe now because we verified it exists

  if (error) throw error;
  return data as Review;
}

/**
 * Mark admin feedback as reviewed
 * @param reviewId The review ID to mark as reviewed
 * @param adminUserId The admin user who reviewed it
 * @param adminNotes Optional notes from the admin
 */
export async function markAdminFeedbackReviewed(
  reviewId: string,
  adminUserId: string,
  adminNotes?: string
) {
  const { data, error } = await supabase
    .from('reviews')
    .update({
      admin_reviewed: true,
      admin_reviewed_at: new Date().toISOString(),
      admin_reviewed_by: adminUserId,
      admin_notes: adminNotes,
    })
    .eq('id', reviewId)
    .select()
    .single();

  if (error) throw error;
  return data as Review;
}

/**
 * Get count of pending admin feedback reviews
 * @returns Number of unreviewed admin feedback items
 */
export async function getPendingAdminFeedbackCount() {
  const { count, error } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('admin_feedback', true)
    .eq('admin_reviewed', false);

  if (error) throw error;
  return count || 0;
}

/**
 * Payment method related functions
 */
export async function getCustomerPaymentMethods(customerId: string) {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('customer_id', customerId)
    .order('is_default', { ascending: false });

  if (error) throw error;
  return data as PaymentMethod[];
}

export async function addPaymentMethod(
  paymentMethod: Omit<PaymentMethod, 'id' | 'created_at'>
) {
  const { data, error } = await supabase
    .from('payment_methods')
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
    .from('payment_methods')
    .update({ is_default: false })
    .eq('customer_id', customerId);

  if (updateError) throw updateError;

  // Then, set default for the specified payment method
  const { data, error } = await supabase
    .from('payment_methods')
    .update({ is_default: true })
    .eq('id', paymentMethodId)
    .eq('customer_id', customerId)
    .select()
    .single();

  if (error) throw error;
  return data as PaymentMethod;
}

export async function removePaymentMethod(paymentMethodId: string) {
  const { error } = await supabase
    .from('payment_methods')
    .delete()
    .eq('id', paymentMethodId);

  if (error) throw error;
  return true;
}

/**
 * Saved Property related functions
 */
export async function getSavedProperties(customerId: string) {
  const { data, error } = await supabase
    .from('saved_properties')
    .select('*')
    .eq('customer_id', customerId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as SavedProperty[];
}

export async function createSavedProperty(
  property: Omit<SavedProperty, 'id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('saved_properties')
    .insert(property)
    .select()
    .single();

  if (error) throw error;
  return data as SavedProperty;
}

export async function updateSavedProperty(
  propertyId: string,
  updates: Partial<SavedProperty>
) {
  const { data, error } = await supabase
    .from('saved_properties')
    .update(updates)
    .eq('id', propertyId)
    .select()
    .single();

  if (error) throw error;
  return data as SavedProperty;
}

export async function deleteSavedProperty(propertyId: string) {
  const { error } = await supabase
    .from('saved_properties')
    .delete()
    .eq('id', propertyId);

  if (error) throw error;
  return true;
}

export async function setDefaultProperty(
  propertyId: string,
  customerId: string
) {
  try {
    // Use the RPC function to ensure only one default property
    const { error } = await supabase.rpc('set_default_property', {
      property_id: propertyId,
      user_id: customerId,
    });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error setting default property:', err);
    throw err;
  }
}

/**
 * Dashboard and reporting functions
 */
export async function getDashboardMetrics() {
  // Optimized version: single batch query using stored procedure
  const { data, error } = await supabase.rpc('get_dashboard_metrics');

  if (error) throw error;
  return data;
}

export async function getBookingsByDateRange(
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date', { ascending: true });

  if (error) throw error;
  return data as Booking[];
}

export async function getRevenueByService() {
  const { data, error } = await supabase
    .from('bookings')
    .select('price, service:services!inner(id, name)')
    .eq('status', 'completed');

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
        typeof service === 'object' &&
        'id' in service &&
        'name' in service
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
  let filterCondition = '';

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
    'Setting up bookings subscription with filter:',
    filterCondition || 'none'
  );

  const channel = supabase
    .channel('bookings-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: filterCondition || undefined,
      },
      (payload) => {
        console.log('Received booking update:', payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('Bookings subscription status:', status);
    });

  return channel;
}

// Subscribe to profile changes (useful for admin dashboards)
export function subscribeToProfiles(
  callback: (payload: any) => void,
  userId?: string
): RealtimeChannel {
  const channel = supabase
    .channel('profiles-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: userId ? `id=eq.${userId}` : undefined,
      },
      (payload) => {
        console.log('Received profile update:', payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('Profiles subscription status:', status);
    });

  return channel;
}

// Subscribe to reviews (useful for technicians and customers)
export function subscribeToReviews(
  callback: (payload: any) => void,
  filters?: { customerId?: string; technicianId?: string; bookingId?: string }
): RealtimeChannel {
  // Building the filter condition
  let filterCondition = '';

  if (filters?.customerId) {
    filterCondition = `customer_id=eq.${filters.customerId}`;
  } else if (filters?.technicianId) {
    filterCondition = `technician_id=eq.${filters.technicianId}`;
  } else if (filters?.bookingId) {
    filterCondition = `booking_id=eq.${filters.bookingId}`;
  }

  const channel = supabase
    .channel('reviews-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reviews',
        filter: filterCondition || undefined,
      },
      (payload) => {
        console.log('Received review update:', payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('Reviews subscription status:', status);
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
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (!includeRead) {
    query = query.eq('is_read', false);
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
  const { data, error } = await supabase.rpc('get_unread_notifications_count');

  if (error) throw error;
  return data as number;
}

/**
 * Mark a notification as read
 * @param notificationId ID of the notification to mark
 * @returns Success status
 */
export async function markNotificationRead(notificationId: string) {
  try {
    const { data, error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId,
    });

    if (error) {
      console.error('Error marking notification read with RPC:', error);
      // Fallback to direct update if RPC fails
      const { data: updateData, error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', await getCurrentUserId());

      if (updateError) {
        console.error('Error with direct update fallback:', updateError);
        throw updateError;
      }
      return true;
    }
    return data as boolean;
  } catch (err) {
    console.error('Notification update failed:', err);
    return false;
  }
}

/**
 * Mark all notifications as read
 * @returns Success status
 */
export async function markAllNotificationsRead() {
  try {
    const { data, error } = await supabase.rpc('mark_all_notifications_read');

    if (error) {
      console.error('Error marking all notifications read with RPC:', error);
      // Fallback to direct update if RPC fails
      const { data: updateData, error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', await getCurrentUserId())
        .eq('is_read', false);

      if (updateError) {
        console.error('Error with direct update fallback:', updateError);
        throw updateError;
      }
      return true;
    }
    return data as boolean;
  } catch (err) {
    console.error('Notification update failed:', err);
    return false;
  }
}

// Helper function to get current user ID
async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id || '';
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
  type: Notification['type'],
  title: string,
  message: string,
  data?: any
) {
  const { data: notificationId, error } = await supabase.rpc(
    'create_notification',
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
export async function subscribeToNotifications(
  callback: (payload: any) => void
): Promise<RealtimeChannel> {
  // Get the current user id synchronously
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;

  if (!userId) {
    console.warn(
      '[subscribeToNotifications] No user ID found, returning empty channel'
    );
    // Return a no-op channel if no user is logged in
    return supabase.channel('notifications-changes-empty');
  }

  console.log(
    `[subscribeToNotifications] Setting up subscription for user: ${userId}`
  );

  const channel = supabase
    .channel('notifications-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('Received notification:', payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('Notifications subscription status:', status);
    });

  return channel;
}

// Stripe-related data helpers
export interface Customer {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  email?: string;
  name?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getCustomer(userId: string) {
  const { data, error } = await supabase
    .from('customers')
    .select<'*', Customer>('*')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  booking_id?: string;
  stripe_payment_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method?: string;
  error_message?: string;
  created_at?: string;
}

export async function getPayments(bookingId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select<'*', PaymentRecord>('*')
    .eq('booking_id', bookingId);
  if (error) throw error;
  return data;
}

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: string;
  price_id: string;
  current_period_start?: string;
  current_period_end?: string;
  canceled_at?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getSubscriptions(customerId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select<'*', SubscriptionRecord>('*')
    .eq('stripe_customer_id', customerId);
  if (error) throw error;
  return data;
}

/**
 * Calls the Supabase Edge Function to process a Stripe refund.
 */
export async function refundPayment(paymentIntentId: string, amount?: number) {
  console.log(
    `Initiating refund for PI: ${paymentIntentId}, Amount: ${amount}`
  );
  if (!paymentIntentId) {
    throw new Error('Payment Intent ID is required for refund.');
  }

  const body: { payment_intent_id: string; amount?: number } = {
    payment_intent_id: paymentIntentId,
  };

  if (amount) {
    // Convert amount from dollars (float) to cents (integer)
    body.amount = Math.round(amount * 100);
    if (body.amount <= 0) {
      throw new Error('Refund amount must be positive.');
    }
  }

  const { data, error } = await supabase.functions.invoke('stripe-refund', {
    body: body,
  });

  if (error) {
    console.error('Supabase function invocation error:', error);
    // Try to parse the error message from the function response if available
    let errorMessage = error.message;
    try {
      const functionError = JSON.parse(error.context?.response?.text || '{}');
      if (functionError.error) {
        errorMessage = functionError.error;
      }
    } catch (e) {
      // Ignore parsing error
    }
    throw new Error(`Refund failed: ${errorMessage}`);
  }

  console.log('Refund function returned successfully:', data);
  return data; // Should contain { refundId, status }
}

/**
 * Refund Request related types and functions
 */
export interface RefundRequest {
  id: string;
  booking_id: string;
  customer_id: string;
  payment_intent_id: string;
  requested_amount: number;
  approved_amount?: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  reviewed_by?: string;
  requested_at: string;
  reviewed_at?: string;

  // Joined data
  booking?: Booking;
  customer?: Profile;
  reviewer?: Profile;
}

/**
 * Check if a booking is eligible for refund request
 */
export async function checkRefundEligibility(bookingId: string) {
  const { data, error } = await supabase.rpc('check_refund_eligibility', {
    p_booking_id: bookingId,
  });

  if (error) throw error;
  return data as { eligible: boolean; reason: string | null };
}

/**
 * Create a refund request for a booking
 */
export async function createRefundRequest(bookingId: string, reason: string) {
  console.log(`Creating refund request for booking: ${bookingId}`);

  if (!reason || reason.length < 20) {
    throw new Error('Refund reason must be at least 20 characters');
  }

  const { data, error } = await supabase.rpc('create_refund_request', {
    p_booking_id: bookingId,
    p_reason: reason,
  });

  if (error) {
    console.error('Error creating refund request:', error);
    throw error;
  }

  console.log('Refund request created successfully:', data);
  return data as string; // Returns the refund request ID
}

/**
 * Get a specific refund request by ID
 */
export async function getRefundRequest(requestId: string) {
  const { data, error } = await supabase
    .from('refund_requests')
    .select(
      `
      *,
      booking:bookings(*),
      customer:profiles!refund_requests_customer_id_fkey(*),
      reviewer:profiles!refund_requests_reviewed_by_fkey(*)
    `
    )
    .eq('id', requestId)
    .single();

  if (error) throw error;
  return data as RefundRequest;
}

/**
 * Get all refund requests for a customer
 */
export async function getCustomerRefundRequests(customerId: string) {
  const { data, error } = await supabase
    .from('refund_requests')
    .select(
      `
      *,
      booking:bookings(*)
    `
    )
    .eq('customer_id', customerId)
    .order('requested_at', { ascending: false });

  if (error) throw error;
  return data as RefundRequest[];
}

/**
 * Get refund request for a specific booking (if exists)
 */
export async function getBookingRefundRequest(bookingId: string) {
  const { data, error } = await supabase
    .from('refund_requests')
    .select(
      `
      *,
      booking:bookings(*),
      customer:profiles!refund_requests_customer_id_fkey(*),
      reviewer:profiles!refund_requests_reviewed_by_fkey(*)
    `
    )
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (error) throw error;
  return data as RefundRequest | null;
}

/**
 * Get all refund requests (admin function)
 * @param status Optional filter by status
 */
export async function getAllRefundRequests(
  status?: 'pending' | 'approved' | 'rejected'
) {
  let query = supabase
    .from('refund_requests')
    .select(
      `
      *,
      booking:bookings(
        *,
        service:services(*)
      ),
      customer:profiles!refund_requests_customer_id_fkey(*),
      reviewer:profiles!refund_requests_reviewed_by_fkey(*)
    `
    )
    .order('requested_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as RefundRequest[];
}

/**
 * Approve a refund request (admin only)
 */
export async function approveRefundRequest(
  requestId: string,
  approvedAmount: number,
  adminNotes?: string
) {
  console.log(
    `Approving refund request: ${requestId}, Amount: $${approvedAmount}`
  );

  const { data, error } = await supabase.rpc('approve_refund_request', {
    p_request_id: requestId,
    p_approved_amount: approvedAmount,
    p_admin_notes: adminNotes,
  });

  if (error) {
    console.error('Error approving refund request:', error);
    throw error;
  }

  console.log('Refund request approved successfully');
  return data as boolean;
}

/**
 * Reject a refund request (admin only)
 */
export async function rejectRefundRequest(
  requestId: string,
  adminNotes: string
) {
  console.log(`Rejecting refund request: ${requestId}`);

  if (!adminNotes || adminNotes.length < 10) {
    throw new Error(
      'Admin notes are required when rejecting (minimum 10 characters)'
    );
  }

  const { data, error } = await supabase.rpc('reject_refund_request', {
    p_request_id: requestId,
    p_admin_notes: adminNotes,
  });

  if (error) {
    console.error('Error rejecting refund request:', error);
    throw error;
  }

  console.log('Refund request rejected successfully');
  return data as boolean;
}

/**
 * Technician Availability and Scheduling types and functions
 */

export interface TechnicianAvailability {
  id: string;
  technician_id: string;
  day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TechnicianTimeBlock {
  id: string;
  technician_id: string;
  blocked_date: string; // YYYY-MM-DD format
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AvailableTimeSlot {
  time_slot: string;
  available_technician_ids: string[];
  available_technician_count: number;
}

export interface AvailableDate {
  available_date: string;
  technician_count: number;
}

/**
 * Get all availability windows for a technician
 */
export async function getTechnicianAvailability(technicianId: string) {
  const { data, error } = await supabase
    .from('technician_availability')
    .select('*')
    .eq('technician_id', technicianId)
    .eq('is_active', true)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data as TechnicianAvailability[];
}

/**
 * Set technician availability for a specific day and time
 */
export async function setTechnicianAvailability(
  technicianId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string
) {
  const { data, error } = await supabase
    .from('technician_availability')
    .insert({
      technician_id: technicianId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as TechnicianAvailability;
}

/**
 * Update existing availability window
 */
export async function updateTechnicianAvailability(
  availabilityId: string,
  updates: Partial<TechnicianAvailability>
) {
  const { data, error } = await supabase
    .from('technician_availability')
    .update(updates)
    .eq('id', availabilityId)
    .select()
    .single();

  if (error) throw error;
  return data as TechnicianAvailability;
}

/**
 * Delete (deactivate) a technician availability window
 */
export async function deleteTechnicianAvailability(availabilityId: string) {
  const { error } = await supabase
    .from('technician_availability')
    .delete()
    .eq('id', availabilityId);

  if (error) throw error;
  return true;
}

/**
 * Get all time blocks for a technician
 */
export async function getTechnicianTimeBlocks(
  technicianId: string,
  startDate?: string,
  endDate?: string
) {
  let query = supabase
    .from('technician_time_blocks')
    .select('*')
    .eq('technician_id', technicianId)
    .order('blocked_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (startDate) {
    query = query.gte('blocked_date', startDate);
  }

  if (endDate) {
    query = query.lte('blocked_date', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as TechnicianTimeBlock[];
}

/**
 * Add a time block for a technician (lunch, travel, time off, etc.)
 */
export async function addTimeBlock(
  technicianId: string,
  blockedDate: string,
  startTime: string,
  endTime: string,
  reason?: string
) {
  const { data, error } = await supabase
    .from('technician_time_blocks')
    .insert({
      technician_id: technicianId,
      blocked_date: blockedDate,
      start_time: startTime,
      end_time: endTime,
      reason: reason,
    })
    .select()
    .single();

  if (error) throw error;
  return data as TechnicianTimeBlock;
}

/**
 * Remove a time block
 */
export async function removeTimeBlock(blockId: string) {
  const { error } = await supabase
    .from('technician_time_blocks')
    .delete()
    .eq('id', blockId);

  if (error) throw error;
  return true;
}

/**
 * Get available dates in a month for a service (for customer date picker)
 */
export async function getAvailableDates(
  serviceId: string,
  year: number,
  month: number
) {
  const { data, error } = await supabase.rpc(
    'get_available_dates_for_service',
    {
      p_service_id: serviceId,
      p_year: year,
      p_month: month,
    }
  );

  if (error) throw error;
  return data as AvailableDate[];
}

/**
 * Get available time slots for a service on a specific date
 */
export async function getAvailableTimeSlots(
  serviceId: string,
  date: string,
  slotInterval: number = 30
) {
  const { data, error } = await supabase.rpc('get_available_time_slots', {
    p_service_id: serviceId,
    p_date: date,
    p_slot_interval_minutes: slotInterval,
  });

  if (error) throw error;
  return data as AvailableTimeSlot[];
}

/**
 * Auto-assign a technician to a booking using round-robin logic
 */
export async function autoAssignBooking(
  bookingId: string,
  scheduledDate: string,
  scheduledTime: string,
  durationMinutes: number
) {
  const { data, error } = await supabase.rpc('auto_assign_technician', {
    p_booking_id: bookingId,
    p_scheduled_date: scheduledDate,
    p_scheduled_time: scheduledTime,
    p_duration_minutes: durationMinutes,
  });

  if (error) {
    console.error('Error auto-assigning technician:', error);
    throw error;
  }

  return data as string | null; // Returns technician_id or null if none available
}

/**
 * Check if a technician has a conflict for a specific time range
 */
export async function checkTechnicianConflict(
  technicianId: string,
  startDatetime: string,
  endDatetime: string,
  excludeBookingId?: string
) {
  const { data, error } = await supabase.rpc('check_technician_conflict', {
    p_technician_id: technicianId,
    p_start_datetime: startDatetime,
    p_end_datetime: endDatetime,
    p_exclude_booking_id: excludeBookingId || null,
  });

  if (error) throw error;
  return data as boolean;
}

// ============================================================================
// AVAILABLE NOW TOGGLE & SCHEDULE PRESETS
// ============================================================================

/**
 * Toggle technician's "Available Now" status (on/off duty)
 */
export async function toggleAcceptingBookings(
  technicianId: string,
  isAccepting: boolean
) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_actively_accepting_bookings: isAccepting })
    .eq('id', technicianId)
    .eq('role', 'technician');

  if (error) throw error;
}

/**
 * Get technician's current "Available Now" status
 */
export async function getAcceptingBookingsStatus(technicianId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('is_actively_accepting_bookings')
    .eq('id', technicianId)
    .single();

  if (error) throw error;
  return data.is_actively_accepting_bookings as boolean;
}

/**
 * Apply a preset schedule pattern to technician availability
 */
export async function applySchedulePreset(
  technicianId: string,
  presetType: 'standard' | 'weekend' | 'fullWeek' | 'clear'
) {
  // First, clear existing availability if needed
  if (presetType === 'clear') {
    await supabase
      .from('technician_availability')
      .delete()
      .eq('technician_id', technicianId);
    return;
  }

  // Define preset patterns
  const presets = {
    standard: [
      // Mon-Fri 9am-5pm
      { day: 1, start: '09:00', end: '17:00' },
      { day: 2, start: '09:00', end: '17:00' },
      { day: 3, start: '09:00', end: '17:00' },
      { day: 4, start: '09:00', end: '17:00' },
      { day: 5, start: '09:00', end: '17:00' },
    ],
    weekend: [
      // Sat-Sun 8am-6pm
      { day: 6, start: '08:00', end: '18:00' },
      { day: 0, start: '08:00', end: '18:00' },
    ],
    fullWeek: [
      // Every day 8am-6pm
      { day: 0, start: '08:00', end: '18:00' },
      { day: 1, start: '08:00', end: '18:00' },
      { day: 2, start: '08:00', end: '18:00' },
      { day: 3, start: '08:00', end: '18:00' },
      { day: 4, start: '08:00', end: '18:00' },
      { day: 5, start: '08:00', end: '18:00' },
      { day: 6, start: '08:00', end: '18:00' },
    ],
  };

  const pattern = presets[presetType];
  if (!pattern) throw new Error('Invalid preset type');

  // Insert all availability windows
  const records = pattern.map((p) => ({
    technician_id: technicianId,
    day_of_week: p.day,
    start_time: p.start,
    end_time: p.end,
    is_active: true,
  }));

  const { error } = await supabase
    .from('technician_availability')
    .insert(records);

  if (error) throw error;
}

/**
 * Copy week pattern for pasting to future weeks
 * Returns the pattern so it can be stored in component state
 */
export async function copyWeekPattern(technicianId: string) {
  const { data, error } = await supabase
    .from('technician_availability')
    .select('day_of_week, start_time, end_time')
    .eq('technician_id', technicianId)
    .eq('is_active', true)
    .order('day_of_week');

  if (error) throw error;
  return data;
}

/**
 * Paste week pattern (apply saved pattern)
 */
export async function pasteWeekPattern(
  technicianId: string,
  pattern: { day_of_week: number; start_time: string; end_time: string }[]
) {
  if (!pattern || pattern.length === 0) {
    throw new Error('No pattern to paste');
  }

  const records = pattern.map((p) => ({
    technician_id: technicianId,
    day_of_week: p.day_of_week,
    start_time: p.start_time,
    end_time: p.end_time,
    is_active: true,
  }));

  const { error } = await supabase
    .from('technician_availability')
    .insert(records);

  if (error) throw error;
}

/**
 * Get summary stats for technician's schedule
 */
export async function getScheduleSummary(technicianId: string) {
  // Get availability windows
  const { data: availability, error: availError } = await supabase
    .from('technician_availability')
    .select('day_of_week, start_time, end_time')
    .eq('technician_id', technicianId)
    .eq('is_active', true);

  if (availError) throw availError;

  // Calculate total hours per week
  const totalHours = (availability || []).reduce((sum, window) => {
    const start = new Date(`2000-01-01T${window.start_time}`);
    const end = new Date(`2000-01-01T${window.end_time}`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return sum + hours;
  }, 0);

  // Count availability per day
  const dayCount: Record<number, number> = {};
  (availability || []).forEach((window) => {
    dayCount[window.day_of_week] = (dayCount[window.day_of_week] || 0) + 1;
  });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const mostAvailable = Object.entries(dayCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([day]) => dayNames[parseInt(day)])
    .join(', ');

  return {
    totalHoursPerWeek: Math.round(totalHours * 10) / 10,
    totalWindows: availability?.length || 0,
    mostAvailableDays: mostAvailable || 'None',
    daysWithAvailability: Object.keys(dayCount).length,
  };
}
