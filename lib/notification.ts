import { Alert, Platform, AlertButton, Vibration } from 'react-native';
import Toast, { ToastType } from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';

interface NotificationParams {
  title: string;
  message?: string;
  type?: ToastType; // 'success' | 'error' | 'info'
  buttons?: AlertButton[];
  webVisibilityTime?: number; // Milliseconds toast is visible on web
}

/**
 * Shows a platform-appropriate notification.
 * On Web: Uses react-native-toast-message (non-interactive).
 * On Native: Uses React Native's Alert (can be interactive).
 *
 * @param params - Notification parameters.
 * @param params.title - The title of the notification.
 * @param params.message - The main message body.
 * @param params.type - Type of toast ('success', 'error', 'info'). Defaults to 'info'. Used only on Web.
 * @param params.buttons - Array of AlertButton objects for native Alert. Ignored on Web.
 * @param params.webVisibilityTime - How long the toast is visible on web (ms). Defaults to 4000.
 */
export function showNotification({
  title,
  message,
  type = 'info',
  buttons,
  webVisibilityTime = 4000,
}: NotificationParams): void {
  if (Platform.OS === 'web') {
    // Web uses Toast - ignores buttons
    Toast.show({
      type: type,
      text1: title,
      text2: message,
      visibilityTime: webVisibilityTime,
      position: 'top',
    });
  } else {
    // Native uses Alert - uses buttons
    Alert.alert(title, message, buttons);
  }
}

// ==================== PUSH NOTIFICATIONS (Phase 2) ====================

/**
 * Configure how notifications are presented when app is in foreground
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get Expo push token
 * @returns Push token string or null if registration failed
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log(
      '[PushNotifications] Push notifications require a physical device'
    );
    return null;
  }

  // Web doesn't support Expo push notifications
  if (Platform.OS === 'web') {
    console.log('[PushNotifications] Push notifications not supported on web');
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log(
        '[PushNotifications] Permission not granted for push notifications'
      );
      return null;
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id', // TODO: Replace with actual Expo project ID
    });

    console.log('[PushNotifications] Push token obtained:', tokenData.data);

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return tokenData.data;
  } catch (error) {
    console.error(
      '[PushNotifications] Error registering for push notifications:',
      error
    );
    return null;
  }
}

/**
 * Save push token to user's profile in database
 * @param userId - User's ID
 * @param pushToken - Expo push token
 */
export async function savePushTokenToProfile(
  userId: string,
  pushToken: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: pushToken })
      .eq('id', userId);

    if (error) {
      console.error('[PushNotifications] Error saving push token:', error);
      return false;
    }

    console.log('[PushNotifications] Push token saved successfully');
    return true;
  } catch (error) {
    console.error('[PushNotifications] Error saving push token:', error);
    return false;
  }
}

/**
 * Remove push token from user's profile (e.g., on logout)
 * @param userId - User's ID
 */
export async function removePushTokenFromProfile(
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: null })
      .eq('id', userId);

    if (error) {
      console.error('[PushNotifications] Error removing push token:', error);
      return false;
    }

    console.log('[PushNotifications] Push token removed successfully');
    return true;
  } catch (error) {
    console.error('[PushNotifications] Error removing push token:', error);
    return false;
  }
}

/**
 * Play notification sound and/or vibrate based on user preferences
 * @param soundEnabled - Whether to play sound
 * @param vibrationEnabled - Whether to vibrate
 */
export function playNotificationFeedback(
  soundEnabled: boolean = true,
  vibrationEnabled: boolean = true
): void {
  if (Platform.OS === 'web') {
    // Web doesn't support vibration/sound through this API
    return;
  }

  if (vibrationEnabled) {
    // Vibrate for 400ms
    Vibration.vibrate(400);
  }

  // Sound is handled by the notification system itself via shouldPlaySound
}

/**
 * Schedule a local notification (not a push notification)
 * Useful for reminders, scheduled tasks, etc.
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput,
  data?: Record<string, any>
): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log(
      '[LocalNotifications] Local notifications not supported on web'
    );
    return null;
  }

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger,
    });

    console.log('[LocalNotifications] Notification scheduled:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('[LocalNotifications] Error scheduling notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled local notification
 */
export async function cancelLocalNotification(
  notificationId: string
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('[LocalNotifications] Notification cancelled:', notificationId);
    return true;
  } catch (error) {
    console.error('[LocalNotifications] Error cancelling notification:', error);
    return false;
  }
}

/**
 * Get all scheduled local notifications
 */
export async function getScheduledNotifications(): Promise<
  Notifications.NotificationRequest[]
> {
  if (Platform.OS === 'web') {
    return [];
  }

  try {
    const notifications =
      await Notifications.getAllScheduledNotificationsAsync();
    return notifications;
  } catch (error) {
    console.error(
      '[LocalNotifications] Error getting scheduled notifications:',
      error
    );
    return [];
  }
}
