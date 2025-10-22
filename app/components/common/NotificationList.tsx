import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Bell, Check, ChevronRight, Filter } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  Notification,
} from '../../../lib/data';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface FormattedNotification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: NotificationType;
  data?: {
    booking_id?: string;
    refund_request_id?: string;
    review_id?: string;
    [key: string]: any;
  };
}

type FilterType = 'all' | 'unread' | 'booking' | 'payment' | 'review';

const mapNotificationTypeToUIType = (type: string): NotificationType => {
  switch (type) {
    case 'booking_created':
    case 'booking_updated':
      return 'info';
    case 'booking_cancelled':
    case 'payment_failed':
      return 'warning';
    case 'review_received':
    case 'payment_processed':
    case 'payment_confirmed':
    case 'booking_completed':
      return 'success';
    default:
      return 'info';
  }
};

const getNotificationTypeColor = (type: NotificationType): string => {
  switch (type) {
    case 'success':
      return 'border-l-4 border-green-500';
    case 'warning':
      return 'border-l-4 border-yellow-500';
    case 'error':
      return 'border-l-4 border-red-500';
    default:
      return 'border-l-4 border-blue-500';
  }
};

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

export default function NotificationList() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<FormattedNotification[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const fetchNotifications = async () => {
    try {
      const notificationsData = await getNotifications(true); // Get all notifications

      const formatted = notificationsData.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        timestamp: new Date(notification.created_at),
        read: notification.is_read,
        type: mapNotificationTypeToUIType(notification.type),
        data: notification.data,
      }));

      setNotifications(formatted);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationTap = (notification: FormattedNotification) => {
    // Mark as read
    handleMarkAsRead(notification.id);

    // Navigate based on notification data
    if (notification.data?.booking_id) {
      router.push(`/booking-details/${notification.data.booking_id}` as any);
    } else if (notification.data?.refund_request_id) {
      router.push(`/refunds/${notification.data.refund_request_id}` as any);
    }
  };

  const filterNotifications = (
    notifs: FormattedNotification[]
  ): FormattedNotification[] => {
    switch (filter) {
      case 'unread':
        return notifs.filter((n) => !n.read);
      case 'booking':
        return notifs.filter((n) => n.data?.booking_id);
      case 'payment':
        return notifs.filter(
          (n) =>
            n.title.toLowerCase().includes('payment') ||
            n.title.toLowerCase().includes('refund')
        );
      case 'review':
        return notifs.filter((n) => n.title.toLowerCase().includes('review'));
      default:
        return notifs;
    }
  };

  const filteredNotifications = filterNotifications(notifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="mt-4 text-gray-600">Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Actions Bar - No duplicate header */}
      <View className="border-b border-gray-200 bg-white p-4">
        <View className="mb-3 flex-row items-center justify-between">
          {unreadCount > 0 && (
            <View className="rounded-full bg-blue-500 px-3 py-1">
              <Text className="text-xs font-medium text-white">
                {unreadCount} unread
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={() => setShowFilterMenu(!showFilterMenu)}
            className="ml-auto flex-row items-center rounded-md bg-gray-100 px-3 py-2"
          >
            <Filter size={16} color="#4b5563" />
            <Text className="ml-1 text-sm capitalize text-gray-700">
              {filter}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Menu */}
        {showFilterMenu && (
          <View className="mb-2 rounded-md bg-gray-100 p-2">
            {['all', 'unread', 'booking', 'payment', 'review'].map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => {
                  setFilter(f as FilterType);
                  setShowFilterMenu(false);
                }}
                className={`rounded p-2 ${filter === f ? 'bg-white' : ''}`}
              >
                <Text
                  className={`capitalize ${filter === f ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            className="flex-row items-center justify-center rounded-md bg-blue-500 py-2"
          >
            <Check size={16} color="#fff" />
            <Text className="ml-1 font-medium text-white">
              Mark All as Read ({unreadCount})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notification List */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              onPress={() => handleNotificationTap(notification)}
              className={`mx-4 mb-2 mt-2 rounded-lg bg-white p-4 shadow-sm ${
                !notification.read ? 'bg-blue-50' : ''
              } ${getNotificationTypeColor(notification.type)}`}
              activeOpacity={0.7}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <View className="mb-1 flex-row items-center justify-between">
                    <Text
                      className={`font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}
                    >
                      {notification.title}
                    </Text>
                    {!notification.read && (
                      <View className="ml-2 h-2 w-2 rounded-full bg-blue-500" />
                    )}
                  </View>

                  <Text className="mb-2 text-sm text-gray-600">
                    {notification.message}
                  </Text>

                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-gray-500">
                      {formatTimeAgo(notification.timestamp)}
                    </Text>

                    {(notification.data?.booking_id ||
                      notification.data?.refund_request_id) && (
                      <View className="flex-row items-center">
                        <Text className="mr-1 text-xs text-blue-600">
                          View details
                        </Text>
                        <ChevronRight size={14} color="#2563eb" />
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View className="flex-1 items-center justify-center py-20">
            <Bell size={48} color="#d1d5db" />
            <Text className="mt-4 px-4 text-center text-gray-500">
              {filter === 'all'
                ? 'No notifications yet'
                : `No ${filter} notifications`}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
