import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import {
  Home,
  Users,
  Settings as SettingsIcon,
  BarChart3,
  CreditCard,
  Cog,
  Calendar,
  DollarSign,
  MessageSquare,
} from 'lucide-react-native';
import ProtectedRoute from '../components/common/ProtectedRoute';
import NotificationsButton from '../components/common/NotificationsButton';

export default function AdminLayout() {
  return (
    <ProtectedRoute requiredRole="admin">
      <View className="flex-1 bg-white">
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: '#10b981',
            tabBarInactiveTintColor: '#6b7280',
            tabBarStyle: {
              backgroundColor: 'white',
              borderTopWidth: 1,
              borderTopColor: '#e5e7eb',
              paddingTop: 5,
              height: 60,
            },
            headerStyle: {
              backgroundColor: 'white',
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: '#e5e7eb',
            },
            headerTitleStyle: {
              color: '#111827',
              fontWeight: 'bold',
            },
            headerRight: () => (
              <View style={{ marginRight: 16 }}>
                <NotificationsButton variant="light" />
              </View>
            ),
          }}
        >
          <Tabs.Screen
            name="dashboard"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ color }) => <Home size={24} color={color} />,
              tabBarLabel: ({ color }) => (
                <Text style={{ color, fontSize: 12, marginBottom: 5 }}>
                  Dashboard
                </Text>
              ),
            }}
          />
          <Tabs.Screen
            name="bookings"
            options={{
              title: 'Bookings',
              tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
              tabBarLabel: ({ color }) => (
                <Text style={{ color, fontSize: 12, marginBottom: 5 }}>
                  Bookings
                </Text>
              ),
            }}
          />
          <Tabs.Screen
            name="users"
            options={{
              title: 'Users',
              tabBarIcon: ({ color }) => <Users size={24} color={color} />,
              tabBarLabel: ({ color }) => (
                <Text style={{ color, fontSize: 12, marginBottom: 5 }}>
                  Users
                </Text>
              ),
            }}
          />
          <Tabs.Screen
            name="services"
            options={{
              title: 'Services',
              tabBarIcon: ({ color }) => (
                <SettingsIcon size={24} color={color} />
              ),
              tabBarLabel: ({ color }) => (
                <Text style={{ color, fontSize: 12, marginBottom: 5 }}>
                  Services
                </Text>
              ),
            }}
          />
          <Tabs.Screen
            name="feedback"
            options={{
              title: 'Feedback',
              tabBarIcon: ({ color }) => (
                <MessageSquare size={24} color={color} />
              ),
              tabBarLabel: ({ color }) => (
                <Text style={{ color, fontSize: 12, marginBottom: 5 }}>
                  Feedback
                </Text>
              ),
            }}
          />
          <Tabs.Screen
            name="analytics"
            options={{
              title: 'Analytics',
              tabBarIcon: ({ color }) => <BarChart3 size={24} color={color} />,
              tabBarLabel: ({ color }) => (
                <Text style={{ color, fontSize: 12, marginBottom: 5 }}>
                  Analytics
                </Text>
              ),
            }}
          />
          <Tabs.Screen
            name="billing"
            options={{
              title: 'Billing',
              tabBarIcon: ({ color }) => <DollarSign size={24} color={color} />,
              tabBarLabel: ({ color }) => (
                <Text style={{ color, fontSize: 12, marginBottom: 5 }}>
                  Billing
                </Text>
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Settings',
              tabBarIcon: ({ color }) => <Cog size={24} color={color} />,
              tabBarLabel: ({ color }) => (
                <Text style={{ color, fontSize: 12, marginBottom: 5 }}>
                  Settings
                </Text>
              ),
            }}
          />
          <Tabs.Screen
            name="notifications"
            options={{
              href: null,
              headerShown: true,
              headerTitle: 'Notifications',
            }}
          />
          {/* Hidden screens removed from layout - let Expo Router discover them */}
          {/* <Tabs.Screen name="payments" options={{ href: null }} /> */}
          {/* <Tabs.Screen name="customers" options={{ href: null }} /> */}
          {/* <Tabs.Screen name="invoices" options={{ href: null }} /> */}
        </Tabs>
      </View>
    </ProtectedRoute>
  );
}
