import React, { useState, useEffect } from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { Bell } from "lucide-react-native";
import {
  getUnreadNotificationsCount,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../../lib/data";
import NotificationCenter from "./NotificationCenter";
import { useAuth } from "../../../lib/auth";
import { useRealtimeNotifications } from "../../../lib/hooks";

interface NotificationsButtonProps {
  variant?: "light" | "dark";
}

const NotificationsButton = ({
  variant = "dark",
}: NotificationsButtonProps) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Real-time subscription for notifications with live unread count
  const {
    unreadCount: realtimeUnreadCount,
    isSubscribed,
  } = useRealtimeNotifications({
    userId: user?.id,
    enabled: !!user?.id,
  });

  // Use real-time count (fallback to 0 if not subscribed yet)
  const unreadCount = realtimeUnreadCount;

  // Log subscription status for debugging
  useEffect(() => {
    if (isSubscribed) {
      console.log("[NotificationsButton] Real-time subscription active, unread count:", unreadCount);
    }
  }, [isSubscribed, unreadCount]);

  const fetchUnreadCount = async () => {
    try {
      const count = await getUnreadNotificationsCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching unread notifications count:", error);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Get all notifications including read ones
      const notificationsData = await getNotifications(true);

      // Format notifications for the NotificationCenter component
      const formattedNotifications = notificationsData.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        timestamp: new Date(notification.created_at),
        read: notification.is_read,
        type: mapNotificationTypeToUIType(notification.type),
        actionUrl: notification.data?.booking_id
          ? `/booking/${notification.data.booking_id}`
          : undefined,
      }));

      setNotifications(formattedNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    // If opening notifications, fetch them first
    if (!showNotifications) {
      await fetchNotifications();
    }
    setShowNotifications(!showNotifications);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const success = await markNotificationRead(id);

      // Update the UI optimistically
      setNotifications(
        notifications.map((notification) =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );

      // Note: Unread count will automatically update via real-time subscription
      // when the database record changes, so we don't need to manually decrement
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleViewAll = async () => {
    try {
      const success = await markAllNotificationsRead();

      // Update the UI optimistically
      setNotifications(
        notifications.map((notification) => ({ ...notification, read: true }))
      );

      // Note: Unread count will automatically update via real-time subscription
      // when the database records change, so we don't need to manually set to 0
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Map backend notification types to UI notification types
  const mapNotificationTypeToUIType = (
    type: string
  ): "info" | "success" | "warning" | "error" => {
    switch (type) {
      case "booking_created":
        return "info";
      case "booking_updated":
        return "info";
      case "booking_cancelled":
        return "warning";
      case "review_received":
        return "success";
      case "payment_processed":
        return "success";
      default:
        return "info";
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={handleToggleNotifications}
        className={`p-2 rounded-full ${
          variant === "dark" ? "bg-gray-800" : "bg-white"
        }`}
      >
        <Bell size={20} color={variant === "dark" ? "#fff" : "#4b5563"} />
        {unreadCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
            <Text className="text-white text-xs font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {showNotifications && (
        <NotificationCenter
          notifications={notifications}
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          onNotificationRead={handleMarkAsRead}
          onViewAll={handleViewAll}
        />
      )}
    </>
  );
};

export default NotificationsButton;
