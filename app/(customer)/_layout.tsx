import React from 'react';
import { Tabs, router, usePathname } from 'expo-router';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import {
  Home,
  Calendar,
  ClipboardList,
  User,
  ChevronLeft,
} from 'lucide-react-native';
import ProtectedRoute from '../components/common/ProtectedRoute';
import NotificationsButton from '../components/common/NotificationsButton';

export default function CustomerLayout() {
  const pathname = usePathname();

  // Main tab routes that don't need back button
  const mainTabs = ['/dashboard', '/services', '/history', '/profile'];
  const isMainTab = mainTabs.some(
    (tab) => pathname === tab || pathname.endsWith(tab)
  );

  return (
    <ProtectedRoute requiredRole="customer">
      <View className="flex-1 bg-white">
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: '#22c55e',
            tabBarInactiveTintColor: '#737373',
            tabBarStyle: {
              backgroundColor: 'white',
              borderTopWidth: 1,
              borderTopColor: '#e5e7eb',
              paddingTop: 5,
              height: 60,
            },
            headerShown: true,
            headerStyle: {
              backgroundColor: 'white',
            },
            headerTitleStyle: {
              color: '#111827',
              fontWeight: 'bold',
            },
            headerLeft: !isMainTab
              ? () => (
                  <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ marginLeft: 16 }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <ChevronLeft size={24} color="#22c55e" />
                  </TouchableOpacity>
                )
              : undefined,
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
              headerTitle: 'Home',
              tabBarIcon: ({ color, focused }) => (
                <Animated.View
                  style={{
                    transform: [{ scale: focused ? 1.1 : 1 }],
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: focused ? 2 : 0 },
                    shadowOpacity: focused ? 0.2 : 0,
                    shadowRadius: focused ? 3 : 0,
                    elevation: focused ? 4 : 0,
                  }}
                >
                  <Home size={24} color={color} />
                </Animated.View>
              ),
              tabBarLabel: ({ color }) => (
                <Text style={{ color, fontSize: 12 }}>Home</Text>
              ),
            }}
          />
          <Tabs.Screen
            name="services"
            options={{
              title: 'Services',
              headerTitle: 'Available Services',
              tabBarIcon: ({ color, focused }) => (
                <Animated.View
                  style={{
                    transform: [{ scale: focused ? 1.1 : 1 }],
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: focused ? 2 : 0 },
                    shadowOpacity: focused ? 0.2 : 0,
                    shadowRadius: focused ? 3 : 0,
                    elevation: focused ? 4 : 0,
                  }}
                >
                  <ClipboardList size={24} color={color} />
                </Animated.View>
              ),
              tabBarLabel: ({ color }) => (
                <Text style={{ color, fontSize: 12 }}>Services</Text>
              ),
            }}
          />
          <Tabs.Screen
            name="history"
            options={{
              title: 'Service History',
              headerTitle: 'Service History',
              tabBarIcon: ({ color, focused }) => (
                <Animated.View
                  style={{
                    transform: [{ scale: focused ? 1.1 : 1 }],
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: focused ? 2 : 0 },
                    shadowOpacity: focused ? 0.2 : 0,
                    shadowRadius: focused ? 3 : 0,
                    elevation: focused ? 4 : 0,
                  }}
                >
                  <ClipboardList size={24} color={color} />
                </Animated.View>
              ),
              tabBarLabel: ({ color }) => (
                <Text style={{ color, fontSize: 12 }}>History</Text>
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'My Profile',
              headerTitle: 'My Profile',
              tabBarIcon: ({ color, focused }) => (
                <Animated.View
                  style={{
                    transform: [{ scale: focused ? 1.1 : 1 }],
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: focused ? 2 : 0 },
                    shadowOpacity: focused ? 0.2 : 0,
                    shadowRadius: focused ? 3 : 0,
                    elevation: focused ? 4 : 0,
                  }}
                >
                  <User size={24} color={color} />
                </Animated.View>
              ),
              tabBarLabel: ({ color }) => (
                <Text style={{ color, fontSize: 12 }}>Profile</Text>
              ),
            }}
          />
          {/* Hidden Screens - Detail views, modals, settings */}
          <Tabs.Screen
            name="booking"
            options={{ href: null, headerShown: false }}
          />
          <Tabs.Screen
            name="booking-details/[id]"
            options={{ href: null, headerShown: true }}
          />
          <Tabs.Screen
            name="booking-details"
            options={{ href: null, headerShown: true }}
          />
          <Tabs.Screen
            name="payment-complete"
            options={{ href: null, headerShown: true }}
          />
          <Tabs.Screen
            name="saved-properties"
            options={{ href: null, headerShown: true }}
          />
          <Tabs.Screen
            name="notifications"
            options={{
              href: null,
              headerShown: true,
              headerTitle: 'Notifications',
            }}
          />
          <Tabs.Screen
            name="notification-preferences"
            options={{
              href: null,
              headerShown: true,
              headerTitle: 'Notification Settings',
            }}
          />
          <Tabs.Screen
            name="job-report/[id]"
            options={{ href: null, headerShown: true }}
          />
        </Tabs>
      </View>
    </ProtectedRoute>
  );
}
