import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { Booking, getBooking } from '../data';
import { RealtimeChannel } from '@supabase/supabase-js';
import { showNotification } from '../notification';

interface UseJobCompletionOptions {
  customerId: string;
  enabled?: boolean;
}

interface UseJobCompletionReturn {
  completedBooking: Booking | null;
  clearCompletedBooking: () => void;
}

/**
 * Hook to detect when a customer's job is completed
 * Listens for real-time booking status changes to "completed"
 * Triggers when a job transitions to completed status
 */
export function useJobCompletion({
  customerId,
  enabled = true,
}: UseJobCompletionOptions): UseJobCompletionReturn {
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(
    null
  );
  const [processedBookings, setProcessedBookings] = useState<Set<string>>(
    new Set()
  );

  const clearCompletedBooking = useCallback(() => {
    setCompletedBooking(null);
  }, []);

  useEffect(() => {
    if (!enabled || !customerId) {
      console.log('[useJobCompletion] Disabled or no customer ID');
      return;
    }

    console.log(
      `[useJobCompletion] Setting up listener for customer: ${customerId}`
    );

    let channel: RealtimeChannel;

    // Subscribe to bookings table changes for this customer
    channel = supabase
      .channel('job-completion-listener')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `customer_id=eq.${customerId}`,
        },
        async (payload) => {
          console.log('[useJobCompletion] Received update:', payload);

          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;

          // Check if the booking just transitioned to completed
          // and it doesn't already have a review
          if (
            newRecord.status === 'completed' &&
            oldRecord.status !== 'completed'
          ) {
            // FIXED: Prevent duplicate prompts
            if (processedBookings.has(newRecord.id)) {
              console.log('[useJobCompletion] Already processed, skipping');
              return;
            }

            console.log(
              '[useJobCompletion] Job completed! Fetching full booking details...'
            );

            // Fetch full booking details with related data
            try {
              const booking = await getBooking(newRecord.id);

              // Check if technician is assigned (required for review)
              if (!booking.technician_id) {
                console.warn(
                  '[useJobCompletion] No technician assigned, skipping review prompt'
                );
                showNotification({
                  title: 'Review Unavailable',
                  message:
                    'This job cannot be reviewed (no technician assigned). Please contact support if needed.',
                  type: 'info',
                });
                // Mark as processed to prevent repeated notifications
                setProcessedBookings(
                  (prev) => new Set([...prev, newRecord.id])
                );
                return;
              }

              // Only show review prompt if no review exists yet
              if (!booking.review) {
                console.log(
                  '[useJobCompletion] No review found, showing prompt'
                );
                setCompletedBooking(booking);

                // Mark as processed
                setProcessedBookings(
                  (prev) => new Set([...prev, newRecord.id])
                );
              } else {
                console.log(
                  '[useJobCompletion] Review already exists, skipping prompt'
                );
              }
            } catch (error) {
              console.error(
                '[useJobCompletion] Error fetching booking details:',
                error
              );

              // FIXED: Show user-facing error notification
              showNotification({
                title: 'Review Prompt Unavailable',
                message:
                  'Unable to load review prompt. You can rate this service from your booking history.',
                type: 'error',
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[useJobCompletion] Subscription status:', status);
      });

    // Cleanup on unmount
    return () => {
      console.log('[useJobCompletion] Cleaning up subscription');
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [customerId, enabled, processedBookings]);

  return {
    completedBooking,
    clearCompletedBooking,
  };
}
