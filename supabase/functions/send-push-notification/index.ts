import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushNotificationPayload {
  notification_id: string;
}

interface NotificationData {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
}

interface ProfileData {
  push_token: string | null;
  push_notifications_enabled: boolean;
  booking_notifications: boolean;
  payment_notifications: boolean;
  review_notifications: boolean;
  message_notifications: boolean;
}

serve(async (req) => {
  try {
    // Get payload from request
    const payload: PushNotificationPayload = await req.json();
    console.log('[send-push-notification] Received payload:', payload);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch notification details
    const { data: notification, error: notificationError } =
      await supabaseClient
        .from('notifications')
        .select('*')
        .eq('id', payload.notification_id)
        .single();

    if (notificationError || !notification) {
      console.error(
        '[send-push-notification] Error fetching notification:',
        notificationError
      );
      return new Response(JSON.stringify({ error: 'Notification not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const notificationData = notification as NotificationData;
    console.log(
      '[send-push-notification] Notification data:',
      notificationData
    );

    // Fetch user's push token and preferences
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select(
        'push_token, push_notifications_enabled, booking_notifications, payment_notifications, review_notifications, message_notifications'
      )
      .eq('id', notificationData.user_id)
      .single();

    if (profileError || !profile) {
      console.error(
        '[send-push-notification] Error fetching profile:',
        profileError
      );
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const profileData = profile as ProfileData;
    console.log('[send-push-notification] Profile data:', {
      has_token: !!profileData.push_token,
      push_enabled: profileData.push_notifications_enabled,
    });

    // Check if push notifications are enabled
    if (!profileData.push_notifications_enabled) {
      console.log(
        '[send-push-notification] Push notifications disabled for user'
      );
      return new Response(
        JSON.stringify({ message: 'Push notifications disabled for user' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has push token
    if (!profileData.push_token) {
      console.log('[send-push-notification] No push token found for user');
      return new Response(
        JSON.stringify({ message: 'No push token found for user' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check notification type preferences
    const notificationType = notificationData.type;
    let shouldSend = true;

    if (notificationType.includes('booking')) {
      shouldSend = profileData.booking_notifications;
    } else if (notificationType.includes('payment')) {
      shouldSend = profileData.payment_notifications;
    } else if (notificationType.includes('review')) {
      shouldSend = profileData.review_notifications;
    } else if (notificationType.includes('message')) {
      shouldSend = profileData.message_notifications;
    }

    if (!shouldSend) {
      console.log(
        '[send-push-notification] User disabled this notification type:',
        notificationType
      );
      return new Response(
        JSON.stringify({ message: 'Notification type disabled by user' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prepare push notification message
    const pushMessage = {
      to: profileData.push_token,
      sound: 'default',
      title: notificationData.title,
      body: notificationData.message,
      data: {
        notification_id: notificationData.id,
        type: notificationData.type,
        ...notificationData.data,
      },
      badge: 1, // TODO: Calculate actual unread count
      priority: 'high',
      channelId: 'default',
    };

    console.log('[send-push-notification] Sending push notification:', {
      to: pushMessage.to.substring(0, 20) + '...',
      title: pushMessage.title,
    });

    // Send push notification via Expo Push API
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(pushMessage),
    });

    const result = await response.json();
    console.log('[send-push-notification] Expo Push API response:', result);

    if (result.data && result.data[0]?.status === 'error') {
      console.error(
        '[send-push-notification] Push notification error:',
        result.data[0]
      );

      // If token is invalid, remove it from profile
      if (result.data[0].details?.error === 'DeviceNotRegistered') {
        console.log('[send-push-notification] Removing invalid push token');
        await supabaseClient
          .from('profiles')
          .update({ push_token: null })
          .eq('id', notificationData.user_id);
      }

      return new Response(
        JSON.stringify({
          error: 'Failed to send push notification',
          details: result,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[send-push-notification] Push notification sent successfully');

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[send-push-notification] Unexpected error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
