import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Modal,
} from 'react-native';
import { Bell, Check, ChevronRight, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';

type NotificationType = 'info' | 'success' | 'warning' | 'error';
type UserRole = 'customer' | 'technician' | 'admin';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: NotificationType;
  actionUrl?: string;
  data?: {
    booking_id?: string;
    refund_request_id?: string;
    review_id?: string;
    [key: string]: any;
  };
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
      id: '1',
      title: 'Welcome to LawnCare Pro',
      message:
        'Thank you for joining our platform. Get started by exploring the app.',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      read: false,
      type: 'info',
    },
    {
      id: '2',
      title: 'Profile Incomplete',
      message:
        'Please complete your profile to get the most out of our services.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      read: true,
      type: 'warning',
      actionUrl: '/profile',
    },
  ];

  const roleSpecificNotifications: Record<UserRole, Notification[]> = {
    customer: [
      {
        id: '3',
        title: 'Upcoming Service',
        message:
          'Your lawn mowing service is scheduled for tomorrow at 10:00 AM.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        read: false,
        type: 'info',
      },
      {
        id: '4',
        title: 'Payment Successful',
        message:
          'Your payment for the recent lawn service has been processed successfully.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        read: false,
        type: 'success',
      },
    ],
    technician: [
      {
        id: '3',
        title: 'New Job Assigned',
        message: 'You have been assigned a new lawn mowing job for tomorrow.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
        read: false,
        type: 'info',
      },
      {
        id: '4',
        title: 'Schedule Change',
        message: 'Your afternoon appointment has been rescheduled to 3:00 PM.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
        read: true,
        type: 'warning',
      },
    ],
    admin: [
      {
        id: '3',
        title: 'New User Registration',
        message: 'A new technician has registered and requires approval.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
        read: false,
        type: 'info',
        actionUrl: '/users',
      },
      {
        id: '4',
        title: 'Revenue Alert',
        message:
          'Monthly revenue has exceeded targets by 15%. View detailed report.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
        read: false,
        type: 'success',
        actionUrl: '/analytics',
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
    case 'success':
      return 'bg-green-100 border-green-500';
    case 'warning':
      return 'bg-yellow-100 border-yellow-500';
    case 'error':
      return 'bg-red-100 border-red-500';
    default:
      return 'bg-blue-100 border-blue-500';
  }
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userRole = 'customer',
  notifications,
  onNotificationRead,
  onNotificationDismiss,
  onViewAll,
  isOpen = true,
  onClose,
}) => {
  const router = useRouter();
  const [activeNotifications, setActiveNotifications] = useState<
    Notification[]
  >(notifications || getDefaultNotifications(userRole));

  const handleMarkAsRead = (id: string) => {
    setActiveNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
    if (onNotificationRead) onNotificationRead(id);
  };

  const handleDismiss = (id: string) => {
    setActiveNotifications((prev) => prev.filter((notif) => notif.id !== id));
    if (onNotificationDismiss) onNotificationDismiss(id);
  };

  const handleNotificationTap = (notification: Notification) => {
    // Mark as read
    handleMarkAsRead(notification.id);

    // Navigate based on notification data
    if (notification.data?.booking_id) {
      onClose?.();
      router.push(`/booking-details/${notification.data.booking_id}` as any);
    } else if (notification.actionUrl) {
      onClose?.();
      router.push(notification.actionUrl as any);
    }
  };

  const unreadCount = activeNotifications.filter((n) => !n.read).length;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/50 p-4">
        {/* Background overlay to dismiss */}
        <Pressable className="absolute inset-0" onPress={onClose} />

        {/* Modal content */}
        <View
          className="max-h-[80%] w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
          style={{ zIndex: 1 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
            <View className="flex-row items-center">
              <Bell size={20} color="#4B5563" />
              <Text className="ml-2 text-lg font-semibold">Notifications</Text>
              {unreadCount > 0 && (
                <View className="ml-2 rounded-full bg-blue-500 px-2 py-0.5">
                  <Text className="text-xs font-medium text-white">
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
                <TouchableOpacity
                  key={notification.id}
                  onPress={() => handleNotificationTap(notification)}
                  className={`border-b border-gray-100 p-4 ${!notification.read ? 'bg-blue-50' : ''}`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text className="font-semibold text-gray-800">
                          {notification.title}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {formatTimeAgo(notification.timestamp)}
                        </Text>
                      </View>
                      <Text className="mt-1 text-gray-600">
                        {notification.message}
                      </Text>

                      <View className="mt-3 flex-row items-center">
                        {!notification.read && (
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                            className="mr-4 flex-row items-center"
                          >
                            <Check size={16} color="#3B82F6" />
                            <Text className="ml-1 text-sm text-blue-500">
                              Mark as read
                            </Text>
                          </TouchableOpacity>
                        )}

                        {(notification.actionUrl ||
                          notification.data?.booking_id) && (
                          <View className="flex-row items-center">
                            <Text className="text-sm text-blue-500">
                              View details
                            </Text>
                            <ChevronRight size={16} color="#3B82F6" />
                          </View>
                        )}
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDismiss(notification.id);
                      }}
                      className="p-1"
                    >
                      <X size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View className="items-center justify-center py-8">
              <Bell size={48} color="#d1d5db" />
              <Text className="mt-2 text-gray-500">No notifications</Text>
            </View>
          )}

          {/* Footer */}
          {activeNotifications.length > 0 && (
            <View className="border-t border-gray-200 p-4">
              <TouchableOpacity
                onPress={onViewAll}
                className="items-center rounded-md bg-gray-100 py-2"
              >
                <Text className="font-medium text-gray-700">
                  View All Notifications
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default NotificationCenter;
