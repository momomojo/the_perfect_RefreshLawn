import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import NotificationPreferences from '../components/common/NotificationPreferences';

export default function TechnicianNotificationPreferences() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <NotificationPreferences />
    </SafeAreaView>
  );
}
