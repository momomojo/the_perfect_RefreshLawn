import React, { useState } from 'react';
import { Tabs, router, usePathname } from 'expo-router';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import {
  Home,
  Users,
  Cog,
  Calendar,
  Menu,
  ChevronLeft,
} from 'lucide-react-native';
import ProtectedRoute from '../components/common/ProtectedRoute';
import NotificationsButton from '../components/common/NotificationsButton';
import DrawerNavigation from '../components/common/DrawerNavigation';

export default function AdminLayout() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const pathname = usePathname();

  // Main tab routes that don't need back button
  const mainTabs = ['/dashboard', '/bookings', '/users', '/services', '/more'];
  const isMainTab = mainTabs.some(
    (tab) => pathname === tab || pathname.endsWith(tab)
  );

  // Drawer routes that should keep More tab highlighted
  const drawerRoutes = [
    '/analytics',
    '/billing',
    '/feedback',
    '/settings',
    '/notification-preferences',
  ];
  const isDrawerRoute = drawerRoutes.some((route) => pathname.includes(route));

  // Custom "More" tab component with active state
  const MoreTabButton = ({
    color,
    focused,
  }: {
    color: string;
    focused: boolean;
  }) => {
    // Keep More tab highlighted when on drawer routes
    const isActive = focused || isDrawerRoute;

    return (
      <Animated.View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 5,
          transform: [{ scale: isActive ? 1.1 : 1 }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: isActive ? 2 : 0 },
          shadowOpacity: isActive ? 0.2 : 0,
          shadowRadius: isActive ? 3 : 0,
          elevation: isActive ? 4 : 0,
        }}
      >
        <Menu size={24} color={isActive ? '#22c55e' : color} />
        <Text
          style={{
            color: isActive ? '#22c55e' : color,
            fontSize: 12,
            marginTop: 2,
          }}
        >
          More
        </Text>
      </Animated.View>
    );
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <View className="flex-1 bg-white">
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: '#22c55e',
            tabBarInactiveTintColor: '#737373',
            tabBarStyle: {
              backgroundColor: 'white',
              borderTopWidth: 1,
              borderTopColor: '#e5e5e5',
              paddingTop: 5,
              height: 60,
            },
            headerStyle: {
              backgroundColor: 'white',
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: '#e5e5e5',
            },
            headerTitleStyle: {
              color: '#171717',
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
          {/* Primary Navigation - 5 Tabs Max */}
          <Tabs.Screen
            name="dashboard"
            options={{
              title: 'Dashboard',
              headerTitle: 'Admin Dashboard',
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
              headerTitle: 'All Bookings',
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
                  <Calendar size={24} color={color} />
                </Animated.View>
              ),
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
              headerTitle: 'User Management',
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
                  <Users size={24} color={color} />
                </Animated.View>
              ),
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
              headerTitle: 'Service Catalog',
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
                  <Cog size={24} color={color} />
                </Animated.View>
              ),
              tabBarLabel: ({ color }) => (
                <Text style={{ color, fontSize: 12, marginBottom: 5 }}>
                  Services
                </Text>
              ),
            }}
          />

          {/* More Tab - Opens Drawer */}
          <Tabs.Screen
            name="more"
            options={{
              title: 'More',
              headerShown: false,
              tabBarButton: (props) => (
                <TouchableOpacity
                  {...props}
                  onPress={(e) => {
                    e.preventDefault();
                    setDrawerVisible(true);
                  }}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MoreTabButton
                    color={
                      props.accessibilityState?.selected ? '#22c55e' : '#737373'
                    }
                    focused={props.accessibilityState?.selected || false}
                  />
                </TouchableOpacity>
              ),
            }}
          />

          {/* Hidden Screens - Moved to Drawer or Detail Views */}
          <Tabs.Screen
            name="analytics"
            options={{
              href: null,
              headerShown: true,
              headerTitle: 'Analytics & Reports',
            }}
          />
          <Tabs.Screen
            name="billing"
            options={{
              href: null,
              headerShown: true,
              headerTitle: 'Billing Hub',
            }}
          />
          <Tabs.Screen
            name="feedback"
            options={{
              href: null,
              headerShown: true,
              headerTitle: 'Customer Feedback',
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              href: null,
              headerShown: true,
              headerTitle: 'App Settings',
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
          <Tabs.Screen
            name="notification-preferences"
            options={{
              href: null,
              headerShown: true,
              headerTitle: 'Notification Settings',
            }}
          />
          <Tabs.Screen
            name="booking/[id]"
            options={{
              href: null,
              headerShown: true,
              headerTitle: 'Booking Details',
            }}
          />
        </Tabs>

        {/* Drawer Navigation Component */}
        <DrawerNavigation
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
        />
      </View>
    </ProtectedRoute>
  );
}
