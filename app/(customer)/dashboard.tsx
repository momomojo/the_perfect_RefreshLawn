import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { User, ArrowUpDown, CalendarDays, Clock } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth';
import {
  getCustomerBookings,
  getServices,
  createReview,
  Service,
  Booking,
  getUpcomingBookings,
  getProfile,
  Profile,
  subscribeToBookings,
  subscribeToProfiles,
  unsubscribeFromChannel,
  updateReviewWithFeedback,
} from '../../lib/data';
import { format } from 'date-fns';
import { Card } from 'react-native-paper';
import { RealtimeChannel } from '@supabase/supabase-js';
import { showNotification } from '../../lib/notification';

import UpcomingAppointments from '../components/customer/UpcomingAppointments';
import QuickBooking from '../components/customer/QuickBooking';
import ReviewPromptModal from '../components/customer/ReviewPromptModal';
import LowRatingFeedbackModal from '../components/customer/LowRatingFeedbackModal';
import GoogleReviewRedirect from '../components/customer/GoogleReviewRedirect';
import { useJobCompletion } from '../../lib/hooks/useJobCompletion';

// Define interfaces for the components
interface FormattedAppointment {
  id: string;
  date: string;
  time: string;
  service: string;
  status: Booking['status'];
  price: string;
}

interface FormattedCompletedService {
  id: string;
  date: string;
  service: string;
  beforeImage: string;
  afterImage: string;
  rating?: number;
}

interface QuickBookingService {
  id: string;
  name: string;
  icon: 'mowing' | 'fertilizing' | 'cleanup' | 'irrigation' | 'schedule';
}

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<
    FormattedAppointment[]
  >([]);
  const [completedServices, setCompletedServices] = useState<
    FormattedCompletedService[]
  >([]);
  const [servicesList, setServicesList] = useState<Service[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showGoogleRedirect, setShowGoogleRedirect] = useState(false);
  const [pendingRating, setPendingRating] = useState<number | null>(null);

  // Job completion listener
  const { completedBooking, clearCompletedBooking } = useJobCompletion({
    customerId: user?.id || '',
    enabled: !!user,
  });

  // References to active subscriptions
  const bookingsChannelRef = React.useRef<RealtimeChannel | null>(null);
  const profileChannelRef = React.useRef<RealtimeChannel | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);

      // Fetch user profile
      const profileData = await getProfile(user.id);
      setProfile(profileData);

      // Fetch upcoming bookings
      const bookingsData = await getUpcomingBookings(user.id);
      setUpcomingBookings(bookingsData);

      // Fetch available services
      const servicesData = await getServices();
      setServicesList(servicesData);

      // Format date function
      const formatDate = (dateStr: string) => {
        try {
          return format(new Date(dateStr), 'EEE, MMM d');
        } catch (e) {
          console.error('Date formatting error:', e);
          return dateStr;
        }
      };

      // Process upcoming appointments (scheduled or pending)
      const upcoming = bookingsData
        .filter((booking: Booking) =>
          [
            'scheduled',
            'pending',
            'pending_payment',
            'payment_processing',
            'payment_confirmed',
          ].includes(booking.status)
        )
        .map((booking: Booking) => ({
          id: booking.id,
          date: formatDate(booking.scheduled_date),
          time: booking.scheduled_time,
          service: booking.service?.name || 'Unknown Service',
          status: booking.status,
          price: `$${booking.price}`,
        }));
      console.log(
        'Dashboard: Processed upcoming appointments:',
        upcoming.length
      );

      // Process completed services with before/after placeholder images
      const completed = bookingsData
        .filter((booking: Booking) => booking.status === 'completed')
        .map((booking: Booking) => ({
          id: booking.id,
          date: formatDate(booking.scheduled_date),
          service: booking.service?.name || 'Unknown Service',
          beforeImage: 'https://via.placeholder.com/150?text=Before',
          afterImage: 'https://via.placeholder.com/150?text=After',
          rating: booking.review?.rating || 0,
        }));
      console.log('Dashboard: Processed completed services:', completed.length);

      setUpcomingAppointments(upcoming);
      setCompletedServices(completed);
      console.log('Dashboard: Data loading completed successfully');
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
      showNotification({
        title: 'Error',
        message: err.message || 'Failed to load dashboard data',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time subscriptions for customer dashboard');

    // Subscribe to bookings changes
    bookingsChannelRef.current = subscribeToBookings(
      (payload) => {
        console.log('Booking update received:', payload);

        // Check if this update is relevant to the current user's bookings
        if (payload.new && payload.new.customer_id === user.id) {
          // Handle different types of changes
          if (payload.eventType === 'INSERT') {
            setUpcomingBookings((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setUpcomingBookings((prev) =>
              prev.map((booking) =>
                booking.id === payload.new.id ? payload.new : booking
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setUpcomingBookings((prev) =>
              prev.filter((booking) => booking.id !== payload.old.id)
            );
          }

          // Refresh the formatted data
          fetchData();
        }
      },
      { customerId: user.id }
    );

    // Subscribe to profile changes
    profileChannelRef.current = subscribeToProfiles((payload) => {
      console.log('Profile update received:', payload);

      if (payload.new && payload.new.id === user.id) {
        setProfile(payload.new);
      }
    }, user.id);

    // Initial data fetch
    fetchData();

    // Cleanup subscriptions on unmount
    return () => {
      console.log('Cleaning up subscriptions');
      if (bookingsChannelRef.current) {
        unsubscribeFromChannel(bookingsChannelRef.current);
      }
      if (profileChannelRef.current) {
        unsubscribeFromChannel(profileChannelRef.current);
      }
    };
  }, [user]); // Only re-subscribe when user changes, not when fetchData changes

  // Show review modal when a job is completed
  useEffect(() => {
    if (completedBooking) {
      console.log('Completed booking detected, showing review modal');
      setShowReviewModal(true);
    }
  }, [completedBooking]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleViewAppointment = (id: string) => {
    // Navigate to the booking details page via dynamic route
    router.push(`/(customer)/booking-details/${id}`);
  };

  const handleBookService = (serviceId: string) => {
    // Find the actual service ID from the service's name
    const service = servicesList.find(
      (s) => s.name === serviceId || s.id === serviceId
    );
    if (service) {
      router.push(`/(customer)/booking?serviceId=${service.id}`);
    } else {
      // If service not found by name, redirect to services page
      router.push('/(customer)/services');
    }
  };

  const handleRateService = async (id: string, rating: number) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the original booking data using the ID
      const { data: bookings } = await getCustomerBookings(user.id);
      const originalBooking = bookings.find((b: Booking) => b.id === id);

      if (!originalBooking || !originalBooking.technician_id) {
        console.error('Cannot find booking or technician info');
        return;
      }

      // Create review
      await createReview({
        booking_id: id,
        customer_id: user.id,
        technician_id: originalBooking.technician_id,
        rating: rating,
      });

      // Refresh data to show the updated rating
      fetchData();
    } catch (err: any) {
      console.error('Error submitting review:', err.message);
      showNotification({
        title: 'Error',
        message: 'Failed to submit rating. Please try again.',
        type: 'error',
      });
    }
  };

  const handleReviewSubmit = async (rating: number) => {
    if (!completedBooking || !user) return;

    // Safety check: This should never happen as validation moved to useJobCompletion hook
    // But keeping as defensive programming practice
    if (!completedBooking.technician_id) {
      console.error(
        '[Dashboard] Unexpected: No technician assigned (should have been caught earlier)'
      );
      showNotification({
        title: 'Error',
        message: 'Unable to submit review. Please try again later.',
        type: 'error',
      });
      setShowReviewModal(false);
      clearCompletedBooking();
      return;
    }

    try {
      console.log('Submitting review for booking:', completedBooking.id);

      // Store the rating temporarily for conditional logic
      setPendingRating(rating);

      // FIXED: Determine admin_feedback flag BEFORE creating review
      const requiresAdminFeedback = rating <= 3;

      // Create review with admin_feedback set correctly from the start
      await createReview({
        booking_id: completedBooking.id,
        customer_id: user.id,
        technician_id: completedBooking.technician_id,
        rating: rating,
        admin_feedback: requiresAdminFeedback, // Set flag at creation
      });

      console.log(
        'Review submitted successfully with admin_feedback:',
        requiresAdminFeedback
      );

      showNotification({
        title: 'Thank you!',
        message: 'Your rating has been submitted',
        type: 'success',
      });

      // Close the review modal
      setShowReviewModal(false);

      // Conditional logic based on rating threshold
      if (rating <= 3) {
        // Low rating (1-3 stars): Show feedback modal
        console.log('Low rating detected, showing feedback modal');
        setShowFeedbackModal(true);
      } else if (rating >= 4) {
        // High rating (4-5 stars): Redirect to Google Reviews
        console.log('High rating detected, showing Google redirect');
        setShowGoogleRedirect(true);
      } else {
        // Fallback: Just close everything
        clearCompletedBooking();
      }

      // Refresh dashboard data
      fetchData();
    } catch (err: any) {
      console.error('Error submitting review:', err);
      showNotification({
        title: 'Error',
        message: 'Failed to submit rating. Please try again.',
        type: 'error',
      });
    }
  };

  const handleRateLater = () => {
    setShowReviewModal(false);
    clearCompletedBooking();

    showNotification({
      title: 'Reminder',
      message: 'You can rate this service from your history later',
      type: 'info',
    });
  };

  const handleFeedbackSubmit = async (feedback: string) => {
    if (!completedBooking || !user || !pendingRating) return;

    try {
      console.log('Submitting feedback for booking:', completedBooking.id);

      // Update the review with the feedback and flag it for admin review
      await updateReviewWithFeedback(completedBooking.id, feedback);

      console.log('Feedback submitted and flagged for admin review');

      showNotification({
        title: 'Thank you!',
        message: 'Your feedback has been sent to our team for review',
        type: 'success',
      });

      setShowFeedbackModal(false);
      clearCompletedBooking();
      setPendingRating(null);
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      throw err; // Let the modal handle the error
    }
  };

  const handleFeedbackSkip = () => {
    // No database update needed anymore!
    // The admin_feedback flag was already set during review creation (Fix #1)
    // Low ratings (1-3) will have admin_feedback = true even without comment text

    setShowFeedbackModal(false);
    clearCompletedBooking();
    setPendingRating(null);

    showNotification({
      title: 'Rating Saved',
      message: 'Your rating has been recorded. Thank you for your feedback!',
      type: 'info',
    });
  };

  const handleGoogleReviewCompleted = () => {
    setShowGoogleRedirect(false);
    clearCompletedBooking();
    setPendingRating(null);

    showNotification({
      title: 'Thank you!',
      message: 'We appreciate you taking the time to review us',
      type: 'success',
    });
  };

  // Extract services data for quick booking
  const quickBookingServices: QuickBookingService[] = servicesList
    .slice(0, 5)
    .map((service) => ({
      id: service.id,
      name: service.name,
      icon: service.name.toLowerCase().includes('mow')
        ? ('mowing' as const)
        : service.name.toLowerCase().includes('fertil')
          ? ('fertilizing' as const)
          : service.name.toLowerCase().includes('clean')
            ? ('cleanup' as const)
            : service.name.toLowerCase().includes('water') ||
                service.name.toLowerCase().includes('irrig')
              ? ('irrigation' as const)
              : ('schedule' as const),
    }));

  // Get user's first name for greeting
  const firstName =
    user?.user_metadata?.first_name || profile?.first_name || 'Customer';

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={{ marginTop: 16, color: '#666' }}>
            Loading your dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ flex: 1 }}>
        <View
          style={{
            padding: 16,
            paddingTop: 8,
            paddingBottom: 16,
            backgroundColor: '#16a34a',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View>
              <Text
                style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}
              >
                Hello, {firstName}
              </Text>
              <Text style={{ color: 'white', fontSize: 14, opacity: 0.8 }}>
                Welcome back to Lawn Refresh
              </Text>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: '#15803d',
                padding: 8,
                borderRadius: 9999,
              }}
              onPress={() => router.push('/profile')}
            >
              <User size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {error && (
            <View
              style={{
                marginBottom: 16,
                padding: 12,
                backgroundColor: '#fee2e2',
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#b91c1c' }}>Error: {error}</Text>
              <TouchableOpacity
                style={{
                  marginTop: 12,
                  padding: 12,
                  backgroundColor: '#f3f4f6',
                  borderRadius: 8,
                }}
                onPress={fetchData}
              >
                <Text style={{ color: '#16a34a', fontWeight: '600' }}>
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ marginBottom: 24 }}>
            <UpcomingAppointments
              appointments={upcomingBookings.filter(
                (booking) =>
                  booking.status === 'scheduled' ||
                  booking.status === 'pending' ||
                  booking.status === 'in_progress' ||
                  booking.status === 'pending_payment' ||
                  booking.status === 'payment_processing' ||
                  booking.status === 'payment_confirmed'
              )}
              onViewAppointment={handleViewAppointment}
            />
          </View>

          <View style={{ marginBottom: 24 }}>
            <QuickBooking
              onServiceSelect={handleBookService}
              services={servicesList.slice(0, 5).map((service) => ({
                id: service.id,
                name: service.name,
                // Map the service type to an icon
                icon: service.name.toLowerCase().includes('mow')
                  ? 'mowing'
                  : service.name.toLowerCase().includes('fertil')
                    ? 'fertilizing'
                    : service.name.toLowerCase().includes('clean')
                      ? 'cleanup'
                      : service.name.toLowerCase().includes('water') ||
                          service.name.toLowerCase().includes('irrigat')
                        ? 'irrigation'
                        : 'schedule',
              }))}
            />
          </View>

          <View
            style={{
              marginBottom: 24,
              backgroundColor: 'white',
              padding: 16,
              borderRadius: 8,
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
              Lawn Care Tips
            </Text>
            <Text style={{ color: '#4b5563' }}>
              Based on recent weather patterns, it is a good time to water your
              lawn in the early morning to prevent evaporation and fungal
              growth.
            </Text>
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>
      </View>

      {/* Review Prompt Modal */}
      <ReviewPromptModal
        visible={showReviewModal}
        booking={completedBooking}
        onClose={() => {
          setShowReviewModal(false);
          clearCompletedBooking();
        }}
        onRatingSubmit={handleReviewSubmit}
        onRateLater={handleRateLater}
      />

      {/* Low Rating Feedback Modal (for ratings ≤ 3) */}
      <LowRatingFeedbackModal
        visible={showFeedbackModal}
        rating={pendingRating || 0}
        onClose={() => {
          setShowFeedbackModal(false);
          clearCompletedBooking();
          setPendingRating(null);
        }}
        onSubmitFeedback={handleFeedbackSubmit}
        onSkip={handleFeedbackSkip}
      />

      {/* Google Review Redirect Modal (for ratings ≥ 4) */}
      <GoogleReviewRedirect
        visible={showGoogleRedirect}
        rating={pendingRating || 0}
        onClose={() => {
          setShowGoogleRedirect(false);
          clearCompletedBooking();
          setPendingRating(null);
        }}
        onReviewCompleted={handleGoogleReviewCompleted}
      />
    </SafeAreaView>
  );
};

export default CustomerDashboard;
