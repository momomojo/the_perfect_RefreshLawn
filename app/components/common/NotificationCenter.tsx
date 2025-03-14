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

type NotificationType = "info" | "success" | "warning" | "error";
type UserRole = "customer" | "technician" | "admin";

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: NotificationType;
  actionUrl?: string;
}

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
      title: "Welcome to LawnCare Pro",
      message:
        "Thank you for joining our platform. Get started by exploring the app.",
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      read: false,
      type: "info",
    },
    {
      id: "2",
      title: "Profile Incomplete",
      message:
        "Please complete your profile to get the most out of our services.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      read: true,
      type: "warning",
      actionUrl: "/profile",
    },
  ];

  const roleSpecificNotifications: Record<UserRole, Notification[]> = {
    customer: [
      {
        id: "3",
        title: "Upcoming Service",
        message:
          "Your lawn mowing service is scheduled for tomorrow at 10:00 AM.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        read: false,
        type: "info",
      },
      {
        id: "4",
        title: "Payment Successful",
        message:
          "Your payment for the recent lawn service has been processed successfully.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        read: false,
        type: "success",
      },
    ],
    technician: [
      {
        id: "3",
        title: "New Job Assigned",
        message: "You have been assigned a new lawn mowing job for tomorrow.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
        read: false,
        type: "info",
      },
      {
        id: "4",
        title: "Schedule Change",
        message: "Your afternoon appointment has been rescheduled to 3:00 PM.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
        read: true,
        type: "warning",
      },
    ],
    admin: [
      {
        id: "3",
        title: "New User Registration",
        message: "A new technician has registered and requires approval.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
        read: false,
        type: "info",
        actionUrl: "/users",
      },
      {
        id: "4",
        title: "Revenue Alert",
        message:
          "Monthly revenue has exceeded targets by 15%. View detailed report.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
        read: false,
        type: "success",
        actionUrl: "/analytics",
      },
    ],
  };

  return [...baseNotifications, ...roleSpecificNotifications[role]];
};

const formatTimeAgo = (date: Date): string => {
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
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif)),
    );
    if (onNotificationRead) onNotificationRead(id);
  };

  const handleDismiss = (id: string) => {
    setActiveNotifications((prev) => prev.filter((notif) => notif.id !== id));
    if (onNotificationDismiss) onNotificationDismiss(id);
  };

  const unreadCount = activeNotifications.filter((n) => !n.read).length;

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
              <View
                key={notification.id}
                className={`p-4 border-b border-gray-100 ${!notification.read ? "bg-gray-50" : ""}`}
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="font-semibold text-gray-800">
                        {notification.title}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {formatTimeAgo(notification.timestamp)}
                      </Text>
                    </View>
                    <Text className="text-gray-600 mt-1">
                      {notification.message}
                    </Text>

                    <View className="flex-row mt-3 items-center">
                      {!notification.read && (
                        <TouchableOpacity
                          onPress={() => handleMarkAsRead(notification.id)}
                          className="flex-row items-center mr-4"
                        >
                          <Check size={16} color="#3B82F6" />
                          <Text className="text-blue-500 text-sm ml-1">
                            Mark as read
                          </Text>
                        </TouchableOpacity>
                      )}

                      {notification.actionUrl && (
                        <TouchableOpacity className="flex-row items-center">
                          <Text className="text-blue-500 text-sm">
                            View details
                          </Text>
                          <ChevronRight size={16} color="#3B82F6" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDismiss(notification.id)}
                    className="p-1"
                  >
                    <X size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>
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
