import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, Text, View, Animated } from 'react-native';
import { Bell } from 'lucide-react-native';
import {
  getUnreadNotificationsCount,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../../lib/data';
import NotificationCenter from './NotificationCenter';
import { useAuth } from '../../../lib/auth';
import { useRealtimeNotifications } from '../../../lib/hooks';
import { useRouter } from 'expo-router';

interface NotificationsButtonProps {
  variant?: 'light' | 'dark';
}

const NotificationsButton = ({
  variant = 'dark',
}: NotificationsButtonProps) => {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Real-time subscription for notifications with live unread count
  const { unreadCount: realtimeUnreadCount, isSubscribed } =
    useRealtimeNotifications({
      userId: user?.id,
      enabled: !!user?.id,
    });

  // Use real-time count (fallback to 0 if not subscribed yet)
  const unreadCount = realtimeUnreadCount;

  // Animation values
  const bellShakeAnim = useRef(new Animated.Value(0)).current;
  const badgeScaleAnim = useRef(new Animated.Value(1)).current;

  // Log subscription status for debugging
  useEffect(() => {
    if (isSubscribed) {
      console.log(
        '[NotificationsButton] Real-time subscription active, unread count:',
        unreadCount
      );
    }
  }, [isSubscribed, unreadCount]);

  // Animate bell shake when new notification arrives
  useEffect(() => {
    if (unreadCount > 0) {
      // Bell shake animation
      Animated.sequence([
        Animated.timing(bellShakeAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(bellShakeAnim, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(bellShakeAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(bellShakeAnim, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();

      // Badge pulse animation
      Animated.sequence([
        Animated.timing(badgeScaleAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(badgeScaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [unreadCount]);

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
        data: notification.data, // Pass through the data object for deep linking
        actionUrl: notification.data?.booking_id
          ? `/booking/${notification.data.booking_id}`
          : undefined,
      }));

      setNotifications(formattedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
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
      console.error('Error marking notification as read:', error);
    }
  };

  const handleViewAll = () => {
    // Close the modal
    setShowNotifications(false);

    // Navigate to the notifications history screen
    // The router will automatically navigate to the correct role-based route
    router.push('/notifications' as any);
  };

  // Map backend notification types to UI notification types
  const mapNotificationTypeToUIType = (
    type: string
  ): 'info' | 'success' | 'warning' | 'error' => {
    switch (type) {
      case 'booking_created':
        return 'info';
      case 'booking_updated':
        return 'info';
      case 'booking_cancelled':
        return 'warning';
      case 'review_received':
        return 'success';
      case 'payment_processed':
        return 'success';
      default:
        return 'info';
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={handleToggleNotifications}
        className={`relative rounded-full p-2 ${
          variant === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <Animated.View
          style={{
            transform: [
              {
                rotate: bellShakeAnim.interpolate({
                  inputRange: [-10, 10],
                  outputRange: ['-10deg', '10deg'],
                }),
              },
            ],
          }}
        >
          <Bell size={20} color={variant === 'dark' ? '#fff' : '#4b5563'} />
        </Animated.View>

        {/* Unread count badge */}
        {unreadCount > 0 && (
          <Animated.View
            style={{
              transform: [{ scale: badgeScaleAnim }],
            }}
            className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-red-500"
          >
            <Text className="text-xs font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </Animated.View>
        )}

        {/* Connection status indicator */}
        <View className="absolute -bottom-0.5 -right-0.5">
          <View
            className={`h-2 w-2 rounded-full ${
              isSubscribed ? 'bg-green-500' : 'bg-gray-400'
            }`}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 1,
            }}
          />
        </View>
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
