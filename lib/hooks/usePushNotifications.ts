import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  registerForPushNotifications,
  savePushTokenToProfile,
  removePushTokenFromProfile,
  playNotificationFeedback,
} from '../notification';
import { useAuth } from '../auth';

interface UsePushNotificationsOptions {
  enabled?: boolean;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
}

interface UsePushNotificationsReturn {
  pushToken: string | null;
  isRegistered: boolean;
  permissionStatus: Notifications.PermissionStatus | null;
  registerToken: () => Promise<boolean>;
  unregisterToken: () => Promise<boolean>;
}

/**
 * Custom hook for managing push notifications
 *
 * Handles:
 * - Token registration on mount
 * - Token persistence to database
 * - Notification listeners (received, tapped)
 * - Sound/vibration preferences
 * - Cleanup on unmount
 *
 * @example
 * ```tsx
 * const { pushToken, isRegistered } = usePushNotifications({
 *   enabled: true,
 *   soundEnabled: true,
 *   vibrationEnabled: true,
 * });
 * ```
 */
export function usePushNotifications(
  options: UsePushNotificationsOptions = {}
): UsePushNotificationsReturn {
  const {
    enabled = true,
    soundEnabled = true,
    vibrationEnabled = true,
  } = options;
  const { user } = useAuth();

  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [permissionStatus, setPermissionStatus] =
    useState<Notifications.PermissionStatus | null>(null);

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Register for push notifications
  const registerToken = async (): Promise<boolean> => {
    if (!enabled || !user) {
      console.log(
        '[usePushNotifications] Registration skipped - not enabled or no user'
      );
      return false;
    }

    if (Platform.OS === 'web') {
      console.log(
        '[usePushNotifications] Push notifications not supported on web'
      );
      return false;
    }

    try {
      console.log(
        '[usePushNotifications] Registering for push notifications...'
      );

      // Get push token
      const token = await registerForPushNotifications();

      if (!token) {
        console.log('[usePushNotifications] Failed to get push token');
        return false;
      }

      // Save token to database
      const saved = await savePushTokenToProfile(user.id, token);

      if (saved) {
        setPushToken(token);
        setIsRegistered(true);
        console.log(
          '[usePushNotifications] Successfully registered and saved token'
        );
        return true;
      }

      console.log('[usePushNotifications] Failed to save token to database');
      return false;
    } catch (error) {
      console.error('[usePushNotifications] Error during registration:', error);
      return false;
    }
  };

  // Unregister push token
  const unregisterToken = async (): Promise<boolean> => {
    if (!user) {
      return false;
    }

    try {
      console.log('[usePushNotifications] Unregistering push token...');

      const removed = await removePushTokenFromProfile(user.id);

      if (removed) {
        setPushToken(null);
        setIsRegistered(false);
        console.log('[usePushNotifications] Successfully unregistered token');
        return true;
      }

      console.log(
        '[usePushNotifications] Failed to remove token from database'
      );
      return false;
    } catch (error) {
      console.error(
        '[usePushNotifications] Error during unregistration:',
        error
      );
      return false;
    }
  };

  // Set up notification listeners
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') {
      return;
    }

    // Check permission status
    Notifications.getPermissionsAsync().then((status) => {
      setPermissionStatus(status.status);
    });

    // Listener for notifications received while app is in foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log(
          '[usePushNotifications] Notification received:',
          notification
        );

        // Play feedback based on preferences
        playNotificationFeedback(soundEnabled, vibrationEnabled);

        // You can add custom handling here
        // For example, update badge count, show in-app notification, etc.
      });

    // Listener for user tapping on notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('[usePushNotifications] Notification tapped:', response);

        // Handle navigation based on notification data
        const data = response.notification.request.content.data;

        if (data?.booking_id) {
          // Navigate to booking details
          console.log(
            '[usePushNotifications] Navigating to booking:',
            data.booking_id
          );
          // TODO: Add navigation logic here
        }
      });

    // Cleanup listeners
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [enabled, soundEnabled, vibrationEnabled]);

  // Auto-register on mount if user is logged in
  useEffect(() => {
    if (enabled && user && !isRegistered && Platform.OS !== 'web') {
      registerToken();
    }
  }, [enabled, user]);

  // Cleanup on unmount or logout
  useEffect(() => {
    return () => {
      // Don't unregister on unmount - keep token for background notifications
      // Only unregister when user explicitly logs out (handled in auth.tsx)
    };
  }, []);

  return {
    pushToken,
    isRegistered,
    permissionStatus,
    registerToken,
    unregisterToken,
  };
}
