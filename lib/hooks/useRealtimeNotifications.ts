import { useState, useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { Notification } from '../data';

interface UseRealtimeNotificationsOptions {
  userId?: string;
  enabled?: boolean;
}

interface UseRealtimeNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isSubscribed: boolean;
}

/**
 * Custom hook for real-time notification updates
 *
 * Subscribes to notifications table changes for the current user and maintains
 * a live count of unread notifications. Automatically handles INSERT, UPDATE,
 * and DELETE events.
 *
 * @param options Configuration options
 * @param options.userId - User ID to filter notifications (optional)
 * @param options.enabled - Whether to enable the subscription (default: true)
 *
 * @returns Object containing notifications array, unread count, and subscription status
 *
 * @example
 * const { notifications, unreadCount } = useRealtimeNotifications({
 *   userId: user?.id,
 *   enabled: !!user?.id
 * });
 */
export function useRealtimeNotifications(
  options: UseRealtimeNotificationsOptions = {}
): UseRealtimeNotificationsReturn {
  const { userId, enabled = true } = options;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Don't subscribe if disabled or no userId
    if (!enabled || !userId) {
      console.log(
        '[useRealtimeNotifications] Subscription disabled or no userId'
      );
      return;
    }

    // Subscription setup function
    const setupSubscription = async () => {
      try {
        console.log(
          `[useRealtimeNotifications] Setting up subscription for user: ${userId}`
        );

        // Fetch initial unread count
        console.log('[useRealtimeNotifications] Fetching initial unread count');
        const { data: initialNotifications, error: fetchError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error(
            '[useRealtimeNotifications] Error fetching initial notifications:',
            fetchError
          );
        } else if (initialNotifications) {
          setNotifications(initialNotifications);
          const initialUnreadCount = initialNotifications.filter(
            (n) => !n.is_read
          ).length;
          setUnreadCount(initialUnreadCount);
          console.log(
            `[useRealtimeNotifications] Initial unread count: ${initialUnreadCount}`
          );
        }

        const channel = supabase
          .channel(`notifications-realtime-${userId}`, {
            config: {
              broadcast: { self: true }, // Receive our own messages
            },
          })
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              console.log(
                '[useRealtimeNotifications] Received notification event:',
                payload
              );

              if (payload.eventType === 'INSERT') {
                const newNotification = payload.new as Notification;

                console.log(
                  '[useRealtimeNotifications] New notification inserted:',
                  newNotification.id
                );

                setNotifications((prev) => {
                  // Prevent duplicates
                  if (prev.some((n) => n.id === newNotification.id)) {
                    console.log(
                      '[useRealtimeNotifications] Duplicate detected, skipping'
                    );
                    return prev;
                  }
                  // Add new notification to the beginning (most recent first)
                  console.log(
                    '[useRealtimeNotifications] Adding notification to list'
                  );
                  return [newNotification, ...prev];
                });

                // If unread, increment count
                if (!newNotification.is_read) {
                  console.log(
                    '[useRealtimeNotifications] Incrementing unread count'
                  );
                  setUnreadCount((prev) => prev + 1);

                  // Play notification feedback if on mobile
                  if (
                    typeof window !== 'undefined' &&
                    'Notification' in window
                  ) {
                    // Browser notification (web)
                    if (Notification.permission === 'granted') {
                      new Notification(newNotification.title, {
                        body: newNotification.message,
                        icon: '/icon.png',
                      });
                    }
                  }
                }
              } else if (payload.eventType === 'UPDATE') {
                const updatedNotification = payload.new as Notification;

                setNotifications((prev) =>
                  prev.map((n) =>
                    n.id === updatedNotification.id ? updatedNotification : n
                  )
                );

                // Recalculate unread count
                setNotifications((prev) => {
                  const newUnreadCount = prev.filter((n) => !n.is_read).length;
                  setUnreadCount(newUnreadCount);
                  return prev;
                });
              } else if (payload.eventType === 'DELETE') {
                const deletedId = payload.old.id;

                setNotifications((prev) => {
                  const filtered = prev.filter((n) => n.id !== deletedId);
                  const newUnreadCount = filtered.filter(
                    (n) => !n.is_read
                  ).length;
                  setUnreadCount(newUnreadCount);
                  return filtered;
                });
              }
            }
          )
          .subscribe((status) => {
            console.log(
              '[useRealtimeNotifications] Subscription status:',
              status
            );
            setIsSubscribed(status === 'SUBSCRIBED');
          });

        channelRef.current = channel;
      } catch (error) {
        console.error(
          '[useRealtimeNotifications] Error setting up subscription:',
          error
        );
      }
    };

    setupSubscription();

    // Cleanup function
    return () => {
      console.log('[useRealtimeNotifications] Cleaning up subscription');

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      setIsSubscribed(false);
    };
  }, [userId, enabled]);

  return {
    notifications,
    unreadCount,
    isSubscribed,
  };
}
