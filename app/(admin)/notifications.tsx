import React from 'react';
import { View } from 'react-native';
import NotificationList from '../components/common/NotificationList';

export default function AdminNotifications() {
  return (
    <View className="flex-1">
      <NotificationList />
    </View>
  );
}
