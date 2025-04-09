import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Bell, Check, ChevronRight, X } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { Notification } from "../../../lib/notification";

type NotificationType = "info" | "success" | "warning" | "error";
type UserRole = "customer" | "technician" | "admin";

interface NotificationCenterProps {
  userRole?: UserRole;
  notifications?: Notification[];
  onNotificationRead?: (id: string) => void;
  onNotificationDismiss?: (id: string) => void;
  onViewAll?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const getDefaultNotifications = (role: UserRole): Notification[] => {
  const baseNotifications: Notification[] = [
    {
      id: "1",
      user_id: "system",
      title: "Welcome to LawnCare Pro",
      message:
        "Thank you for joining our platform. Get started by exploring the app.",
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      is_read: false,
      type: "info" as Notification["type"],
      data: null,
    },
    {
      id: "2",
      user_id: "system",
      title: "Profile Incomplete",
      message:
        "Please complete your profile to get the most out of our services.",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      is_read: true,
      type: "warning" as Notification["type"],
      data: { path: "/profile" },
    },
  ];

  const roleSpecificNotifications: Record<UserRole, Partial<Notification>[]> = {
    customer: [
      {
        id: "3",
        title: "Upcoming Service",
        message:
          "Your lawn mowing service is scheduled for tomorrow at 10:00 AM.",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        is_read: false,
        type: "info",
      },
      {
        id: "4",
        title: "Payment Successful",
        message:
          "Your payment for the recent lawn service has been processed successfully.",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        is_read: false,
        type: "success",
      },
    ],
    technician: [
      {
        id: "3",
        title: "New Job Assigned",
        message: "You have been assigned a new lawn mowing job for tomorrow.",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        is_read: false,
        type: "info",
      },
      {
        id: "4",
        title: "Schedule Change",
        message: "Your afternoon appointment has been rescheduled to 3:00 PM.",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
        is_read: true,
        type: "warning",
      },
    ],
    admin: [
      {
        id: "3",
        title: "New User Registration",
        message: "A new technician has registered and requires approval.",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        is_read: false,
        type: "info",
        data: { path: "/users" },
      },
      {
        id: "4",
        title: "Revenue Alert",
        message:
          "Monthly revenue has exceeded targets by 15%. View detailed report.",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
        is_read: false,
        type: "success",
        data: { path: "/analytics" },
      },
    ],
  };

  const combinedNotifications = [
    ...baseNotifications,
    ...roleSpecificNotifications[role].map((n) => ({
      user_id: "system",
      data: null,
      ...n,
      type: n.type as Notification["type"],
    })),
  ];

  return combinedNotifications;
};

const formatTimeAgo = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} sec ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} hr ago`;
  return `${Math.floor(diffInSeconds / 86400)} day ago`;
};

const getNotificationColor = (type: NotificationType): string => {
  switch (type) {
    case "success":
      return "bg-green-100 border-green-500";
    case "warning":
      return "bg-yellow-100 border-yellow-500";
    case "error":
      return "bg-red-100 border-red-500";
    default:
      return "bg-blue-100 border-blue-500";
  }
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userRole = "customer",
  notifications,
  onNotificationRead,
  onNotificationDismiss,
  onViewAll,
  isOpen = true,
  onClose,
}) => {
  const [activeNotifications, setActiveNotifications] = useState<
    Notification[]
  >(notifications || getDefaultNotifications(userRole));

  const handleMarkAsRead = (id: string) => {
    setActiveNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, is_read: true } : notif
      )
    );
    if (onNotificationRead) onNotificationRead(id);
  };

  const handleDismiss = (id: string) => {
    setActiveNotifications((prev) => prev.filter((notif) => notif.id !== id));
    if (onNotificationDismiss) onNotificationDismiss(id);
  };

  const unreadCount = activeNotifications.filter((n) => !n.is_read).length;

  if (!isOpen) {
    return null;
  }

  return (
    <BlurView
      intensity={80}
      tint="light"
      className="absolute top-0 right-0 bottom-0 left-0 z-50 flex items-center justify-center"
    >
      <View className="w-[90%] max-h-[80%] bg-white rounded-xl overflow-hidden shadow-xl border border-gray-200">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <View className="flex-row items-center">
            <Bell size={20} color="#4B5563" />
            <Text className="text-lg font-semibold ml-2">Notifications</Text>
            {unreadCount > 0 && (
              <View className="ml-2 bg-blue-500 rounded-full px-2 py-0.5">
                <Text className="text-xs text-white font-medium">
                  {unreadCount}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} className="p-1">
            <X size={20} color="#4B5563" />
          </TouchableOpacity>
        </View>

        {/* Notification List */}
        {activeNotifications.length > 0 ? (
          <ScrollView className="max-h-[500px]">
            {activeNotifications.map((notification) => (
              <Pressable
                key={notification.id}
                onPress={() => {
                  if (!notification.is_read) handleMarkAsRead(notification.id);
                }}
                className={`p-3 mb-2 border-l-4 rounded-r-lg ${
                  notification.is_read ? "bg-gray-50" : "bg-white"
                } ${getNotificationColor(
                  notification.type as NotificationType
                )}`}
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 pr-2">
                    <Text
                      className={`font-semibold ${
                        notification.is_read ? "text-gray-600" : "text-gray-800"
                      }`}
                    >
                      {notification.title}
                    </Text>
                    <Text
                      className={`text-sm mt-1 ${
                        notification.is_read ? "text-gray-500" : "text-gray-700"
                      }`}
                    >
                      {notification.message}
                    </Text>
                  </View>
                  <View className="flex-col items-end">
                    <Text className="text-xs text-gray-400 whitespace-nowrap">
                      {formatTimeAgo(notification.created_at)}
                    </Text>
                    {!notification.is_read && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        className="mt-2 p-1 bg-blue-100 rounded-full"
                      >
                        <Check size={14} color="#3B82F6" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View className="py-8 items-center justify-center">
            <Text className="text-gray-500">No notifications</Text>
          </View>
        )}

        {/* Footer */}
        {activeNotifications.length > 0 && (
          <View className="p-4 border-t border-gray-200">
            <TouchableOpacity
              onPress={onViewAll}
              className="items-center py-2 bg-gray-100 rounded-md"
            >
              <Text className="text-gray-700 font-medium">
                View All Notifications
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Background overlay to dismiss */}
      <Pressable
        className="absolute top-0 right-0 bottom-0 left-0 -z-10"
        onPress={onClose}
      />
    </BlurView>
  );
};

export default NotificationCenter;
