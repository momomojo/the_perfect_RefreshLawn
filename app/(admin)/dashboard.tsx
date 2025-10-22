import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import BusinessMetrics from '../components/admin/BusinessMetrics';
import TodayOverview from '../components/admin/TodayOverview';
import QuickActions from '../components/admin/QuickActions';
import { useUserRole } from '../../hooks/useUserRole';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getAllBookings, Booking, Profile } from '../../lib/data';
import { format } from 'date-fns';
import { useRealtimeBookings } from '../../lib/hooks';

const AdminDashboard = () => {
  const { refreshRole } = useUserRole();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metricsData, setMetricsData] = useState({
    revenue: '$0',
    revenueChange: '+0%',
    revenueIsPositive: true,
    jobsCompleted: '0',
    jobsChange: '+0%',
    jobsIsPositive: true,
    customerSatisfaction: '0/5',
    satisfactionChange: '+0',
    satisfactionIsPositive: true,
    activeCustomers: '0',
    customersChange: '+0%',
    customersIsPositive: true,
  });
  const [upcomingJobs, setUpcomingJobs] = useState<Booking[]>([]);
  const [issuesCount, setIssuesCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);

  // Format bookings to match the TodayOverview component's expectations
  const formatBookingsForDisplay = (bookings: Booking[]) => {
    return bookings.map((booking) => {
      // Map workflow_status to component-expected status
      let displayStatus: 'scheduled' | 'in-progress' | 'completed' | 'issue' =
        'scheduled';

      if (booking.workflow_status === 'completed') {
        displayStatus = 'completed';
      } else if (booking.workflow_status === 'in_progress') {
        displayStatus = 'in-progress';
      } else if (booking.workflow_status === 'cancelled') {
        displayStatus = 'issue';
      } else if (
        booking.workflow_status === 'scheduled' ||
        booking.workflow_status === 'pending_assignment'
      ) {
        displayStatus = 'scheduled';
      }

      return {
        id: booking.id,
        time: booking.scheduled_time,
        address: booking.address || 'No address provided',
        service: booking.service?.name || 'Unknown service',
        technician: booking.technician?.first_name
          ? `${booking.technician.first_name} ${booking.technician.last_name}`
          : 'Unassigned',
        status: displayStatus,
        // Include hybrid status fields for future use
        paymentStatus: booking.payment_status,
        workflowStatus: booking.workflow_status,
      };
    });
  };

  // Fetch metrics and bookings data
  const fetchDashboardData = useCallback(async () => {
    try {
      if (!loading) setRefreshing(true);
      if (loading) setLoading(true);

      // Get today's date in ISO format (YYYY-MM-DD)
      const today = format(new Date(), 'yyyy-MM-dd');

      // Fetch all bookings
      const bookingsData = await getAllBookings();
      setAllBookings(bookingsData);

      // Filter bookings for today
      const todaysBookings = bookingsData.filter(
        (booking) => booking.scheduled_date === today
      );

      // Calculate metrics
      const totalRevenue = bookingsData.reduce(
        (sum, booking) => sum + Number(booking.price),
        0
      );

      // Use hybrid status: workflow_status for job state
      const completedBookings = bookingsData.filter(
        (booking) => booking.workflow_status === 'completed'
      );

      const completedTodayCount = todaysBookings.filter(
        (booking) => booking.workflow_status === 'completed'
      ).length;

      const inProgressTodayCount = todaysBookings.filter(
        (booking) => booking.workflow_status === 'in_progress'
      ).length;

      const issuesCount = todaysBookings.filter(
        (booking) => booking.workflow_status === 'cancelled'
      ).length;

      // Get scheduled bookings for today
      const scheduledToday = todaysBookings.filter(
        (booking) =>
          booking.workflow_status === 'scheduled' ||
          booking.workflow_status === 'pending_assignment'
      );

      // Calculate customer satisfaction from reviews
      const { data: reviews } = await supabase.from('reviews').select('rating');

      const averageRating =
        reviews && reviews.length > 0
          ? (
              reviews.reduce((sum, review) => sum + review.rating, 0) /
              reviews.length
            ).toFixed(1)
          : '0.0';

      // Get customer count
      const { data: customers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'customer');

      const customerCount = customers ? customers.length : 0;

      // Update state with real data
      setMetricsData({
        revenue: `$${totalRevenue.toFixed(2)}`,
        revenueChange: '+12.5%', // Would need historical data for real calculation
        revenueIsPositive: true,
        jobsCompleted: completedBookings.length.toString(),
        jobsChange: '+8.2%', // Would need historical data for real calculation
        jobsIsPositive: true,
        customerSatisfaction: `${averageRating}/5`,
        satisfactionChange: '+0.3', // Would need historical data for real calculation
        satisfactionIsPositive: true,
        activeCustomers: customerCount.toString(),
        customersChange: '+5.7%', // Would need historical data for real calculation
        customersIsPositive: true,
      });

      setUpcomingJobs(scheduledToday);
      setCompletedCount(completedTodayCount);
      setInProgressCount(inProgressTodayCount);
      setIssuesCount(issuesCount);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading]);

  // Subscribe to real-time booking updates (admin sees all bookings)
  useEffect(() => {
    const channel = supabase
      .channel('admin-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          console.log('Admin: Booking change detected', payload);
          // Refresh dashboard data when any booking changes
          fetchDashboardData();
        }
      )
      .subscribe();

    // Initial data fetch
    fetchDashboardData();

    return () => {
      console.log('Cleaning up admin dashboard subscription');
      supabase.removeChannel(channel);
    };
  }, [fetchDashboardData]);

  // Handler functions for quick actions
  const handleAddUser = () => {
    router.push('/users');
  };

  const handleAddService = () => {
    router.push('/services');
  };

  const handleGenerateReport = () => {
    router.push('/analytics');
  };

  const handleManagePayments = () => {
    router.push('/billing');
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-100">
        <ActivityIndicator size="large" color="#16a34a" />
        <Text className="mt-4 text-gray-600">Loading dashboard data...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-100 p-4">
        <Text className="mb-4 text-lg text-red-500">{error}</Text>
        <TouchableOpacity
          className="rounded-lg bg-green-600 px-4 py-2"
          onPress={() => window.location.reload()}
        >
          <Text className="font-semibold text-white">Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchDashboardData}
            colors={['#16a34a']}
            tintColor="#16a34a"
          />
        }
      >
        <View className="p-4">
          {/* Header */}
          <View className="mb-6 flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-gray-800">
                Admin Dashboard
              </Text>
              <Text className="text-gray-500">Welcome back, Admin</Text>
            </View>
          </View>

          {/* Business Metrics */}
          <View className="mb-6">
            <BusinessMetrics {...metricsData} />
          </View>

          {/* Today's Overview */}
          <View className="mb-6">
            <TodayOverview
              scheduledJobs={formatBookingsForDisplay(upcomingJobs)}
              issuesCount={issuesCount}
              completedCount={completedCount}
              inProgressCount={inProgressCount}
            />
          </View>

          {/* Quick Actions */}
          <View className="mb-6">
            <QuickActions
              onAddUser={handleAddUser}
              onAddService={handleAddService}
              onGenerateReport={handleGenerateReport}
              onManagePayments={handleManagePayments}
            />
          </View>

          <View className="mb-6 rounded-lg border border-purple-300 bg-purple-100 p-4">
            <Text className="mb-2 font-semibold text-purple-800">
              This page is only accessible to administrators
            </Text>
            <Text className="text-purple-700">
              The admin layout's ProtectedRoute component is protecting this
              route by checking the user's role in the JWT token claims. If a
              non-admin user tries to access this page, they will be redirected.
            </Text>

            <TouchableOpacity
              className="mt-4 self-start rounded-lg bg-purple-600 px-4 py-2"
              onPress={refreshRole}
            >
              <Text className="font-semibold text-white">
                Refresh Role Claims
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminDashboard;
