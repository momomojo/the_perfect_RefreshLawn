/**
 * Shared utilities for Technician components
 * Reduces code duplication across JobsList, TodayJobs, and JobDetail
 */

import { format } from 'date-fns';
import {
  WorkflowStatusType,
  PaymentStatusType,
} from './constants/bookingStatus';

/**
 * Job data structure used by technician components
 */
export interface TechnicianJob {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  serviceType: string;
  scheduledDate: string;
  scheduledTime: string;
  workflowStatus: WorkflowStatusType;
  paymentStatus: PaymentStatusType;
  estimatedDuration?: string;
  specialInstructions?: string;
}

/**
 * Format time string from HH:mm:ss to human-readable format
 * @param timeString - Time in HH:mm:ss format
 * @returns Formatted time like "2:30 PM"
 */
export function formatScheduledTime(timeString: string): string {
  try {
    return format(new Date(`2000-01-01T${timeString}`), 'h:mm a');
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeString;
  }
}

/**
 * Format customer name from profile data
 * @param customer - Customer profile object
 * @returns Full name or "Unknown Customer"
 */
export function formatCustomerName(
  customer:
    | {
        first_name?: string;
        last_name?: string;
      }
    | null
    | undefined
): string {
  if (!customer) return 'Unknown Customer';

  const firstName = customer.first_name || '';
  const lastName = customer.last_name || '';

  if (!firstName && !lastName) return 'Unknown Customer';

  return `${firstName} ${lastName}`.trim();
}

/**
 * Format customer address from profile or booking data
 * @param booking - Booking object with address or customer data
 * @returns Formatted address string
 */
export function formatCustomerAddress(booking: {
  address?: string | null;
  customer?: {
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip_code?: string | null;
  } | null;
}): string {
  // Use booking address if available
  if (booking.address) {
    return booking.address;
  }

  // Otherwise build from customer profile
  if (booking.customer) {
    const { address, city, state, zip_code } = booking.customer;

    if (!address) return 'No address provided';

    const parts = [address];
    if (city) parts.push(city);
    if (state) parts.push(state);
    if (zip_code) parts.push(zip_code);

    return parts.join(', ');
  }

  return 'No address provided';
}

/**
 * Map a booking from the database to the TechnicianJob format
 * @param booking - Raw booking object from database
 * @returns Formatted TechnicianJob object
 */
export function mapBookingToJob(booking: any): TechnicianJob {
  return {
    id: booking.id,
    customerName: formatCustomerName(booking.customer),
    customerPhone: booking.customer?.phone || '',
    address: formatCustomerAddress(booking),
    serviceType: booking.service?.name || 'Unknown Service',
    scheduledDate: format(new Date(booking.scheduled_date), 'MMMM d, yyyy'),
    scheduledTime: formatScheduledTime(booking.scheduled_time),
    workflowStatus: booking.workflow_status,
    paymentStatus: booking.payment_status,
    estimatedDuration: booking.service?.duration_minutes
      ? `${booking.service.duration_minutes} minutes`
      : undefined,
    specialInstructions: booking.notes || undefined,
  };
}

/**
 * Check if a date string is today
 * @param dateString - Date in YYYY-MM-DD format
 * @returns true if date is today
 */
export function isToday(dateString: string): boolean {
  const today = new Date();
  const date = new Date(dateString);

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Get sort priority for workflow status
 * Used to sort jobs by urgency/importance
 * @param status - Workflow status
 * @returns Priority number (lower = higher priority)
 */
export function getStatusSortPriority(status: WorkflowStatusType): number {
  const priorityMap: Record<WorkflowStatusType, number> = {
    in_progress: 1,
    scheduled: 2,
    pending_assignment: 3,
    completed: 4,
    cancelled: 5,
  };

  return priorityMap[status] ?? 99;
}

/**
 * Sort jobs by status priority and then by date
 * @param jobs - Array of jobs to sort
 * @returns Sorted array (mutates original)
 */
export function sortJobsByPriority(jobs: TechnicianJob[]): TechnicianJob[] {
  return jobs.sort((a, b) => {
    const priorityDiff =
      getStatusSortPriority(a.workflowStatus) -
      getStatusSortPriority(b.workflowStatus);
    if (priorityDiff !== 0) return priorityDiff;

    // If same priority, sort by date (earlier first)
    return (
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );
  });
}
