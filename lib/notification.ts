import { Alert, Platform, AlertButton } from 'react-native';
import Toast, { ToastType } from 'react-native-toast-message';

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
