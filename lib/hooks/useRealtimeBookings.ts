import { useState, useEffect, useRef, useCallback } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import {
  Booking,
  subscribeToBookings,
  unsubscribeFromChannel,
} from "../data";
import { performanceMonitor, PERF_OPS } from "../performance-monitoring";

interface UseRealtimeBookingsOptions {
  customerId?: string;
  technicianId?: string;
  bookingId?: string;
  enabled?: boolean;
}

interface UseRealtimeBookingsReturn {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  isSubscribed: boolean;
}

/**
 * Custom hook for real-time booking subscriptions
 *
 * @example
 * // Customer dashboard - get customer's bookings
 * const { bookings } = useRealtimeBookings({ customerId: user.id });
 *
 * @example
 * // Technician dashboard - get technician's jobs
 * const { bookings } = useRealtimeBookings({ technicianId: user.id });
 *
 * @example
 * // Booking detail page - subscribe to specific booking
 * const { bookings, setBookings } = useRealtimeBookings({ bookingId: id });
 */
export function useRealtimeBookings(
  options: UseRealtimeBookingsOptions = {}
): UseRealtimeBookingsReturn {
  const { customerId, technicianId, bookingId, enabled = true } = options;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Don't subscribe if disabled or no filter provided
    if (!enabled || (!customerId && !technicianId && !bookingId)) {
      return;
    }

    console.log("Setting up real-time booking subscription", {
      customerId,
      technicianId,
      bookingId,
    });

    // Start performance tracking for subscription setup
    const subscriptionTimerId = `subscription-${Date.now()}`;
    performanceMonitor.startTimer(subscriptionTimerId);

    // Build filter object
    const filters: Record<string, string> = {};
    if (customerId) filters.customerId = customerId;
    if (technicianId) filters.technicianId = technicianId;
    if (bookingId) filters.bookingId = bookingId;

    // Subscribe to booking changes
    channelRef.current = subscribeToBookings(
      (payload) => {
        // Track real-time update latency
        const updateTimerId = `${PERF_OPS.REALTIME_UPDATE}-${Date.now()}`;
        performanceMonitor.startTimer(updateTimerId);

        console.log("Real-time booking update:", payload.eventType, payload);

        if (payload.eventType === "INSERT" && payload.new) {
          setBookings((prev) => {
            // Avoid duplicates
            const exists = prev.find((b) => b.id === payload.new.id);
            if (exists) return prev;
            return [...prev, payload.new];
          });
        } else if (payload.eventType === "UPDATE" && payload.new) {
          setBookings((prev) =>
            prev.map((booking) =>
              booking.id === payload.new.id ? payload.new : booking
            )
          );
        } else if (payload.eventType === "DELETE" && payload.old) {
          setBookings((prev) =>
            prev.filter((booking) => booking.id !== payload.old.id)
          );
        }

        // End update tracking
        performanceMonitor.endTimer(updateTimerId, {
          eventType: payload.eventType,
          bookingId: payload.new?.id || payload.old?.id,
        });
      },
      filters
    );

    setIsSubscribed(true);

    // End subscription setup tracking
    performanceMonitor.endTimer(subscriptionTimerId, {
      customerId,
      technicianId,
      bookingId,
    });

    // Cleanup on unmount or when filters change
    return () => {
      console.log("Cleaning up real-time booking subscription");
      if (channelRef.current) {
        unsubscribeFromChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsSubscribed(false);
    };
  }, [customerId, technicianId, bookingId, enabled]);

  return {
    bookings,
    setBookings,
    isSubscribed,
  };
}
