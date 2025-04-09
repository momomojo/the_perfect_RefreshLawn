import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { queryWithRetry } from "./queryWithRetry"; // Import retry utility

// Dedicated module for notification-related operations
// (e.g., creating, fetching, marking notifications as read, subscribing)

export {}; // Add export to make it a module

/**
 * Types for the database models
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
 * Get notifications for the current user
 * @param includeRead Whether to include read notifications
 * @returns List of notifications
 */
export async function getNotifications(includeRead = false) {
  // Helper function to get current user ID (moved here)
  async function getCurrentUserIdLocal(): Promise<string> {
    // Apply retry logic to getSession
    const { data } = await queryWithRetry(() => supabase.auth.getSession());
    return data.session?.user.id || "";
  }

  const userId = await getCurrentUserIdLocal();
  if (!userId) return []; // Return empty if no user

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId) // Filter by current user
    .order("created_at", { ascending: false });

  if (!includeRead) {
    query = query.eq("is_read", false);
  }

  // Apply retry logic to the final query
  const { data, error } = await queryWithRetry(() => query);

  if (error) throw error;
  return data as Notification[];
}

/**
 * Get unread notifications count
 * @returns Count of unread notifications
 */
export async function getUnreadNotificationsCount() {
  // Apply retry logic to the RPC call
  const { data, error } = await queryWithRetry(() =>
    supabase.rpc("get_unread_notifications_count")
  );

  if (error) throw error;
  return data as number;
}

/**
 * Mark a notification as read
 * @param notificationId ID of the notification to mark
 * @returns Success status
 */
export async function markNotificationRead(notificationId: string) {
  // Helper function to get current user ID (moved here)
  async function getCurrentUserIdLocal(): Promise<string> {
    // Apply retry logic to getSession
    const { data } = await queryWithRetry(() => supabase.auth.getSession());
    return data.session?.user.id || "";
  }

  try {
    // Apply retry logic to the RPC call
    const { data, error } = await queryWithRetry(() =>
      supabase.rpc("mark_notification_read", {
        p_notification_id: notificationId,
      })
    );

    if (error) {
      console.error("Error marking notification read with RPC:", error);
      // Fallback to direct update if RPC fails
      const currentUserId = await getCurrentUserIdLocal(); // Get user ID for fallback
      if (!currentUserId)
        throw new Error("User not authenticated for fallback.");

      // Apply retry logic to the fallback update
      const { error: updateError } = await queryWithRetry(() =>
        supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", notificationId)
          .eq("user_id", currentUserId)
      );

      if (updateError) {
        console.error("Error with direct update fallback:", updateError);
        throw updateError;
      }
      return true;
    }
    return data as boolean;
  } catch (err) {
    console.error("Notification update failed:", err);
    return false;
  }
}

/**
 * Mark all notifications as read
 * @returns Success status
 */
export async function markAllNotificationsRead() {
  // Helper function to get current user ID (moved here)
  async function getCurrentUserIdLocal(): Promise<string> {
    // Apply retry logic to getSession
    const { data } = await queryWithRetry(() => supabase.auth.getSession());
    return data.session?.user.id || "";
  }

  try {
    // Apply retry logic to the RPC call
    const { data, error } = await queryWithRetry(() =>
      supabase.rpc("mark_all_notifications_read")
    );

    if (error) {
      console.error("Error marking all notifications read with RPC:", error);
      // Fallback to direct update if RPC fails
      const currentUserId = await getCurrentUserIdLocal(); // Get user ID for fallback
      if (!currentUserId)
        throw new Error("User not authenticated for fallback.");

      // Apply retry logic to the fallback update
      const { error: updateError } = await queryWithRetry(() =>
        supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", currentUserId)
          .eq("is_read", false)
      );

      if (updateError) {
        console.error("Error with direct update fallback:", updateError);
        throw updateError;
      }
      return true;
    }
    return data as boolean;
  } catch (err) {
    console.error("Notification update failed:", err);
    return false;
  }
}

/**
 * Create a notification manually (for testing or admin purposes)
 * This function internally calls the `create_notification` RPC function.
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
  // Apply retry logic to the RPC call
  const { data: notificationId, error } = await queryWithRetry(() =>
    supabase.rpc("create_notification", {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_message: message,
      p_data: data ? JSON.stringify(data) : null, // Ensure data is stringified if provided
    })
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
  // Note: Applying retry here might be complex due to async setup.
  // Better to handle potential initial session error gracefully.
  supabase.auth
    .getSession()
    .then(({ data: sessionData }) => {
      const userId = sessionData.session?.user.id;
      if (!userId) {
        console.warn("Cannot subscribe to notifications: No user session.");
        return null; // Return null or handle appropriately
      }

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
          if (status === "SUBSCRIBED") {
            console.log(
              "Successfully subscribed to notifications channel for user:",
              userId
            );
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error(
              "Failed to subscribe to notifications channel. Status:",
              status
            );
          }
        });

      // It's better practice to return the channel immediately
      // or handle the async nature more explicitly if the caller depends on the channel object
      // For now, returning channel, but caller should be aware it might subscribe slightly later.
      return channel;
    })
    .catch((error) => {
      console.error(
        "Error getting session for notification subscription:",
        error
      );
    });

  // Since getSession is async, returning the channel directly might be problematic
  // depending on how it's used. Returning undefined or null might be safer initially.
  return undefined; // Or manage the async nature properly
}
