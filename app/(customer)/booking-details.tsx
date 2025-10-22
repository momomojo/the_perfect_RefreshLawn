import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { getBooking, Booking } from '../../lib/data';
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Info,
  FileText,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { showNotification } from '../../lib/notification';
import { StatusBadge } from '../components/common/StatusBadge';

export default function BookingDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('No booking ID provided');
      setLoading(false);
      return;
    }

    const fetchBookingDetails = async () => {
      try {
        if (!user) {
          throw new Error('User not authenticated');
        }

        const bookingData = await getBooking(id as string);
        if (!bookingData) {
          throw new Error('Booking not found');
        }

        // Check if this booking belongs to the current user
        if (bookingData.customer_id !== user.id) {
          throw new Error("You don't have permission to view this booking");
        }

        setBooking(bookingData);
      } catch (err: any) {
        console.error('Error fetching booking details:', err);
        setError(err.message || 'Failed to load booking details');
        showNotification({
          title: 'Error',
          message: err.message || 'Failed to load booking details',
          type: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [id, user]);

  // Format time from 24-hour to 12-hour format
  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return format(date, 'h:mm a');
    } catch (err) {
      console.error('Error formatting time:', err);
      return timeString;
    }
  };

  // Format date to readable format
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'EEEE, MMMM d, yyyy');
    } catch (err) {
      console.error('Error formatting date:', err);
      return dateString;
    }
  };

  const goBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#16a34a" />
        <Text className="mt-4 text-gray-600">Loading booking details...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50 p-4">
        <Text className="mb-4 text-lg text-red-500">{error}</Text>
        <TouchableOpacity
          className="rounded-lg bg-green-600 px-4 py-2"
          onPress={goBack}
        >
          <Text className="font-semibold text-white">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: 'Booking Details',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#F9FAFB' },
        }}
      />

      <ScrollView className="flex-1 p-4">
        <View className="mb-4 rounded-xl bg-white p-4 shadow-md">
          <Text className="mb-2 text-2xl font-bold text-gray-800">
            {booking?.service?.name || 'Unknown Service'}
          </Text>

          <View className="mb-4 flex-row items-center justify-between">
            {/* Hybrid Status Display */}
            <StatusBadge
              paymentStatus={booking?.payment_status}
              workflowStatus={booking?.workflow_status}
              showBoth
              size="small"
            />
            <Text className="text-xl font-bold text-gray-800">
              ${booking?.price?.toFixed(2) || '0.00'}
            </Text>
          </View>

          <View className="border-t border-gray-200 pt-4">
            <View className="mb-3 flex-row items-center">
              <Calendar size={20} color="#4B5563" />
              <Text className="ml-2 text-gray-700">
                {formatDate(booking?.scheduled_date)}
              </Text>
            </View>

            <View className="mb-3 flex-row items-center">
              <Clock size={20} color="#4B5563" />
              <Text className="ml-2 text-gray-700">
                {formatTime(booking?.scheduled_time)}
              </Text>
            </View>

            <View className="mb-3 flex-row items-start">
              <MapPin size={20} color="#4B5563" style={{ marginTop: 2 }} />
              <Text className="ml-2 flex-1 text-gray-700">
                {booking?.address || 'No address provided'}
              </Text>
            </View>

            {booking?.notes && (
              <View className="mb-3 flex-row items-start">
                <Info size={20} color="#4B5563" style={{ marginTop: 2 }} />
                <Text className="ml-2 flex-1 text-gray-700">
                  {booking.notes}
                </Text>
              </View>
            )}

            {booking?.stripe_payment_intent_id && (
              <View className="mb-3 rounded-md bg-gray-100 p-3">
                <Text className="font-semibold text-gray-700">
                  Payment Info
                </Text>
                <Text className="mt-1 text-xs text-gray-600">
                  Payment ID: {booking.stripe_payment_intent_id}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* View Job Report button for completed jobs */}
        {booking?.workflow_status === 'completed' && (
          <TouchableOpacity
            className="mb-4 flex-row items-center justify-center rounded-lg bg-green-600 px-4 py-3"
            onPress={() => router.push(`/(customer)/job-report/${booking.id}`)}
          >
            <FileText size={20} color="white" />
            <Text className="ml-2 font-semibold text-white">
              View Job Report
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          className="mb-8 items-center rounded-lg bg-gray-600 px-4 py-3"
          onPress={goBack}
        >
          <Text className="font-semibold text-white">Return to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
