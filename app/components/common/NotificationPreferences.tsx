import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Bell,
  Volume2,
  Vibrate,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { useAuth } from '../../../lib/auth';
import { usePushNotifications } from '../../../lib/hooks';
import { supabase } from '../../../lib/supabase';
import { showNotification } from '../../../lib/notification';

interface NotificationPreferencesData {
  push_notifications_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  booking_notifications: boolean;
  payment_notifications: boolean;
  review_notifications: boolean;
  message_notifications: boolean;
}

export default function NotificationPreferences() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferencesData>({
    push_notifications_enabled: true,
    sound_enabled: true,
    vibration_enabled: true,
    booking_notifications: true,
    payment_notifications: true,
    review_notifications: true,
    message_notifications: true,
  });

  const {
    pushToken,
    isRegistered,
    permissionStatus,
    registerToken,
    unregisterToken,
  } = usePushNotifications({
    enabled: preferences.push_notifications_enabled,
    soundEnabled: preferences.sound_enabled,
    vibrationEnabled: preferences.vibration_enabled,
  });

  // Fetch current preferences from database
  useEffect(() => {
    fetchPreferences();
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setPreferences({
          push_notifications_enabled: data.push_notifications_enabled ?? true,
          sound_enabled: data.notification_sound_enabled ?? true,
          vibration_enabled: data.notification_vibration_enabled ?? true,
          booking_notifications: data.booking_notifications ?? true,
          payment_notifications: data.payment_notifications ?? true,
          review_notifications: data.review_notifications ?? true,
          message_notifications: data.message_notifications ?? true,
        });
      }
    } catch (error) {
      console.error(
        '[NotificationPreferences] Error fetching preferences:',
        error
      );
      showNotification({
        title: 'Error',
        message: 'Failed to load notification preferences',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          push_notifications_enabled: preferences.push_notifications_enabled,
          notification_sound_enabled: preferences.sound_enabled,
          notification_vibration_enabled: preferences.vibration_enabled,
          booking_notifications: preferences.booking_notifications,
          payment_notifications: preferences.payment_notifications,
          review_notifications: preferences.review_notifications,
          message_notifications: preferences.message_notifications,
        })
        .eq('id', user.id);

      if (error) throw error;

      showNotification({
        title: 'Success',
        message: 'Notification preferences saved',
        type: 'success',
      });
    } catch (error) {
      console.error(
        '[NotificationPreferences] Error saving preferences:',
        error
      );
      showNotification({
        title: 'Error',
        message: 'Failed to save notification preferences',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePushToggle = async (value: boolean) => {
    setPreferences({ ...preferences, push_notifications_enabled: value });

    if (value && !isRegistered) {
      // Register for push notifications
      const success = await registerToken();
      if (!success) {
        showNotification({
          title: 'Permission Denied',
          message: 'Please enable push notifications in your device settings',
          type: 'error',
        });
        setPreferences({ ...preferences, push_notifications_enabled: false });
      }
    } else if (!value && isRegistered) {
      // Unregister push notifications
      await unregisterToken();
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="mt-4 text-gray-600">Loading preferences...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="mb-2 text-2xl font-bold text-gray-900">
            Notification Preferences
          </Text>
          <Text className="text-gray-600">
            Manage how and when you receive notifications
          </Text>
        </View>

        {/* Push Notifications Section */}
        <View className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center">
              <Bell size={20} color="#10b981" />
              <Text className="ml-2 text-lg font-semibold text-gray-900">
                Push Notifications
              </Text>
            </View>
            <Switch
              value={preferences.push_notifications_enabled}
              onValueChange={handlePushToggle}
              trackColor={{ false: '#d1d5db', true: '#10b981' }}
              disabled={Platform.OS === 'web'}
            />
          </View>

          {Platform.OS === 'web' ? (
            <Text className="text-sm text-gray-500">
              Push notifications are only available on mobile devices
            </Text>
          ) : (
            <>
              <Text className="mb-3 text-sm text-gray-600">
                Receive notifications even when the app is closed
              </Text>

              {/* Status Indicator */}
              {preferences.push_notifications_enabled && (
                <View className="mt-2 rounded-md bg-gray-50 p-3">
                  <View className="flex-row items-center">
                    {isRegistered ? (
                      <>
                        <CheckCircle size={16} color="#10b981" />
                        <Text className="ml-2 text-sm text-green-700">
                          Push notifications active
                        </Text>
                      </>
                    ) : (
                      <>
                        <XCircle size={16} color="#ef4444" />
                        <Text className="ml-2 text-sm text-red-700">
                          Push notifications not configured
                        </Text>
                      </>
                    )}
                  </View>

                  {pushToken && (
                    <Text className="mt-2 text-xs text-gray-500">
                      Token: {pushToken.substring(0, 20)}...
                    </Text>
                  )}
                </View>
              )}
            </>
          )}
        </View>

        {/* Sound & Vibration Section */}
        <View className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          <Text className="mb-4 text-lg font-semibold text-gray-900">
            Notification Feedback
          </Text>

          {/* Sound */}
          <View className="flex-row items-center justify-between border-b border-gray-100 py-3">
            <View className="flex-1 flex-row items-center">
              <Volume2 size={18} color="#6b7280" />
              <Text className="ml-2 text-gray-900">Sound</Text>
            </View>
            <Switch
              value={preferences.sound_enabled}
              onValueChange={(value) =>
                setPreferences({ ...preferences, sound_enabled: value })
              }
              trackColor={{ false: '#d1d5db', true: '#10b981' }}
              disabled={Platform.OS === 'web'}
            />
          </View>

          {/* Vibration */}
          <View className="flex-row items-center justify-between py-3">
            <View className="flex-1 flex-row items-center">
              <Vibrate size={18} color="#6b7280" />
              <Text className="ml-2 text-gray-900">Vibration</Text>
            </View>
            <Switch
              value={preferences.vibration_enabled}
              onValueChange={(value) =>
                setPreferences({ ...preferences, vibration_enabled: value })
              }
              trackColor={{ false: '#d1d5db', true: '#10b981' }}
              disabled={Platform.OS === 'web'}
            />
          </View>

          {Platform.OS === 'web' && (
            <Text className="mt-2 text-xs text-gray-500">
              Sound and vibration settings are only available on mobile
            </Text>
          )}
        </View>

        {/* Notification Types Section */}
        <View className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          <Text className="mb-4 text-lg font-semibold text-gray-900">
            Notification Types
          </Text>

          {/* Booking Notifications */}
          <View className="flex-row items-center justify-between border-b border-gray-100 py-3">
            <View className="flex-1">
              <Text className="font-medium text-gray-900">Booking Updates</Text>
              <Text className="mt-1 text-sm text-gray-500">
                Booking confirmations, status changes, assignments
              </Text>
            </View>
            <Switch
              value={preferences.booking_notifications}
              onValueChange={(value) =>
                setPreferences({ ...preferences, booking_notifications: value })
              }
              trackColor={{ false: '#d1d5db', true: '#10b981' }}
            />
          </View>

          {/* Payment Notifications */}
          <View className="flex-row items-center justify-between border-b border-gray-100 py-3">
            <View className="flex-1">
              <Text className="font-medium text-gray-900">Payment Updates</Text>
              <Text className="mt-1 text-sm text-gray-500">
                Payment confirmations, refunds, failed payments
              </Text>
            </View>
            <Switch
              value={preferences.payment_notifications}
              onValueChange={(value) =>
                setPreferences({ ...preferences, payment_notifications: value })
              }
              trackColor={{ false: '#d1d5db', true: '#10b981' }}
            />
          </View>

          {/* Review Notifications */}
          <View className="flex-row items-center justify-between border-b border-gray-100 py-3">
            <View className="flex-1">
              <Text className="font-medium text-gray-900">Reviews</Text>
              <Text className="mt-1 text-sm text-gray-500">
                New reviews, review requests, ratings
              </Text>
            </View>
            <Switch
              value={preferences.review_notifications}
              onValueChange={(value) =>
                setPreferences({ ...preferences, review_notifications: value })
              }
              trackColor={{ false: '#d1d5db', true: '#10b981' }}
            />
          </View>

          {/* Message Notifications */}
          <View className="flex-row items-center justify-between py-3">
            <View className="flex-1">
              <Text className="font-medium text-gray-900">Messages</Text>
              <Text className="mt-1 text-sm text-gray-500">
                Direct messages, announcements, system alerts
              </Text>
            </View>
            <Switch
              value={preferences.message_notifications}
              onValueChange={(value) =>
                setPreferences({ ...preferences, message_notifications: value })
              }
              trackColor={{ false: '#d1d5db', true: '#10b981' }}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={savePreferences}
          disabled={saving}
          className={`items-center rounded-lg py-4 ${
            saving ? 'bg-gray-400' : 'bg-green-600'
          }`}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-base font-semibold text-white">
              Save Preferences
            </Text>
          )}
        </TouchableOpacity>

        {/* Additional Info */}
        <View className="mt-6 rounded-lg bg-blue-50 p-4">
          <Text className="mb-2 text-sm font-medium text-blue-900">
            📱 About Notifications
          </Text>
          <Text className="text-xs text-blue-800">
            • In-app notifications work on all platforms
            {'\n'}• Push notifications require a physical device (not
            simulators)
            {'\n'}• You can manage device notification permissions in your
            system settings
            {'\n'}• Turning off a notification type affects both in-app and push
            notifications
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
