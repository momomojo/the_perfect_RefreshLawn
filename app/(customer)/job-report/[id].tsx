import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  DollarSign,
  FileText,
  ChevronLeft,
  CheckCircle,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { Booking } from '../../../lib/data';
import { showNotification } from '../../../lib/notification';

export default function JobReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchJobReport();
  }, [id]);

  const fetchJobReport = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch booking with all related data
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(
          `
          *,
          service:services(*),
          technician:profiles!bookings_technician_id_fkey(
            id,
            first_name,
            last_name,
            phone
          ),
          customer:profiles!bookings_customer_id_fkey(
            id,
            first_name,
            last_name,
            email
          )
        `
        )
        .eq('id', id)
        .single();

      if (bookingError) throw bookingError;

      // Only show completed bookings
      if (bookingData.workflow_status !== 'completed') {
        setError('This job report is only available for completed services.');
        return;
      }

      setBooking(bookingData as any);
    } catch (err) {
      console.error('Error fetching job report:', err);
      setError('Failed to load job report. Please try again.');
      showNotification({
        title: 'Error',
        message: 'Failed to load job report',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Stack.Screen options={{ title: 'Job Report', headerShown: true }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22c55e" />
          <Text className="mt-4 text-gray-500">Loading job report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Stack.Screen options={{ title: 'Job Report', headerShown: true }} />
        <View className="flex-1 items-center justify-center p-6">
          <FileText size={64} color="#ef4444" />
          <Text className="mt-4 text-xl font-bold text-gray-900">
            Report Not Available
          </Text>
          <Text className="mt-2 text-center text-gray-500">
            {error || 'Unable to load job report'}
          </Text>
          <TouchableOpacity
            className="mt-6 rounded-lg bg-green-600 px-6 py-3"
            onPress={() => router.back()}
          >
            <Text className="font-semibold text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const service = booking.service as any;
  const technician = booking.technician as any;
  const customer = booking.customer as any;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: 'Job Report',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center"
            >
              <ChevronLeft size={24} color="#22c55e" />
              <Text className="ml-1 text-green-600">Back</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView className="flex-1">
        {/* Header Section */}
        <View className="bg-green-600 p-6">
          <View className="mb-2 flex-row items-center">
            <CheckCircle size={32} color="white" />
            <Text className="ml-3 text-2xl font-bold text-white">
              Job Completed
            </Text>
          </View>
          <Text className="text-base text-green-100">
            Your lawn care service has been successfully completed
          </Text>
        </View>

        <View className="p-4">
          {/* Service Details Card */}
          <View className="mb-4 rounded-lg border border-gray-200 bg-white">
            <View className="border-b border-gray-200 p-4">
              <Text className="text-lg font-bold text-gray-900">
                Service Details
              </Text>
            </View>

            <View className="p-4">
              {/* Service Name */}
              <View className="mb-4 flex-row items-start">
                <FileText size={20} color="#22c55e" className="mt-1" />
                <View className="ml-3 flex-1">
                  <Text className="text-sm text-gray-500">Service</Text>
                  <Text className="text-base font-semibold text-gray-900">
                    {service?.name || 'Lawn Care Service'}
                  </Text>
                </View>
              </View>

              {/* Date */}
              <View className="mb-4 flex-row items-start">
                <Calendar size={20} color="#22c55e" className="mt-1" />
                <View className="ml-3 flex-1">
                  <Text className="text-sm text-gray-500">Date</Text>
                  <Text className="text-base font-semibold text-gray-900">
                    {booking.booking_date
                      ? format(parseISO(booking.booking_date), 'MMMM d, yyyy')
                      : 'Not specified'}
                  </Text>
                </View>
              </View>

              {/* Time */}
              <View className="mb-4 flex-row items-start">
                <Clock size={20} color="#22c55e" className="mt-1" />
                <View className="ml-3 flex-1">
                  <Text className="text-sm text-gray-500">Time</Text>
                  <Text className="text-base font-semibold text-gray-900">
                    {booking.booking_time || 'Not specified'}
                  </Text>
                </View>
              </View>

              {/* Address */}
              <View className="mb-4 flex-row items-start">
                <MapPin size={20} color="#22c55e" className="mt-1" />
                <View className="ml-3 flex-1">
                  <Text className="text-sm text-gray-500">Location</Text>
                  <Text className="text-base font-semibold text-gray-900">
                    {booking.service_address || 'Not specified'}
                  </Text>
                </View>
              </View>

              {/* Technician */}
              {technician && (
                <View className="mb-4 flex-row items-start">
                  <User size={20} color="#22c55e" className="mt-1" />
                  <View className="ml-3 flex-1">
                    <Text className="text-sm text-gray-500">Technician</Text>
                    <Text className="text-base font-semibold text-gray-900">
                      {technician.first_name} {technician.last_name}
                    </Text>
                    {technician.phone && (
                      <Text className="mt-1 text-sm text-gray-600">
                        {technician.phone}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Amount */}
              <View className="flex-row items-start">
                <DollarSign size={20} color="#22c55e" className="mt-1" />
                <View className="ml-3 flex-1">
                  <Text className="text-sm text-gray-500">Total Amount</Text>
                  <Text className="text-base font-semibold text-gray-900">
                    ${parseFloat(booking.total_amount || '0').toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Before & After Photos */}
          {(booking.before_photo_url || booking.after_photo_url) && (
            <View className="mb-4 rounded-lg border border-gray-200 bg-white">
              <View className="border-b border-gray-200 p-4">
                <Text className="text-lg font-bold text-gray-900">
                  Before & After Photos
                </Text>
              </View>

              <View className="p-4">
                <View className="-mx-2 flex-row flex-wrap">
                  {/* Before Photo */}
                  {booking.before_photo_url && (
                    <View className="mb-4 w-1/2 px-2">
                      <Text className="mb-2 text-sm font-semibold text-gray-700">
                        Before
                      </Text>
                      <Image
                        source={{
                          uri: booking.before_photo_url.startsWith('http')
                            ? booking.before_photo_url
                            : `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/booking-images/${booking.before_photo_url}`,
                        }}
                        className="h-48 w-full rounded-lg bg-gray-100"
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  {/* After Photo */}
                  {booking.after_photo_url && (
                    <View className="mb-4 w-1/2 px-2">
                      <Text className="mb-2 text-sm font-semibold text-gray-700">
                        After
                      </Text>
                      <Image
                        source={{
                          uri: booking.after_photo_url.startsWith('http')
                            ? booking.after_photo_url
                            : `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/booking-images/${booking.after_photo_url}`,
                        }}
                        className="h-48 w-full rounded-lg bg-gray-100"
                        resizeMode="cover"
                      />
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Technician Notes */}
          {booking.tech_notes && (
            <View className="mb-4 rounded-lg border border-gray-200 bg-white">
              <View className="border-b border-gray-200 p-4">
                <Text className="text-lg font-bold text-gray-900">
                  Technician Notes
                </Text>
              </View>
              <View className="p-4">
                <Text className="text-base leading-6 text-gray-700">
                  {booking.tech_notes}
                </Text>
              </View>
            </View>
          )}

          {/* Payment Information */}
          <View className="mb-4 rounded-lg border border-gray-200 bg-white">
            <View className="border-b border-gray-200 p-4">
              <Text className="text-lg font-bold text-gray-900">
                Payment Information
              </Text>
            </View>
            <View className="p-4">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-sm text-gray-600">Payment Status</Text>
                <View className="rounded-full bg-green-100 px-3 py-1">
                  <Text className="text-sm font-semibold text-green-800">
                    {booking.payment_status === 'confirmed'
                      ? 'Paid'
                      : booking.payment_status}
                  </Text>
                </View>
              </View>

              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-sm text-gray-600">Service Amount</Text>
                <Text className="text-base font-semibold text-gray-900">
                  ${parseFloat(booking.total_amount || '0').toFixed(2)}
                </Text>
              </View>

              {booking.stripe_payment_intent_id && (
                <View className="mt-3 border-t border-gray-200 pt-3">
                  <Text className="text-xs text-gray-500">
                    Transaction ID: {booking.stripe_payment_intent_id}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Email Status (if sent) */}
          {booking.report_email_sent && booking.report_email_sent_at && (
            <View className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <View className="flex-row items-center">
                <CheckCircle size={16} color="#2563eb" />
                <Text className="ml-2 font-semibold text-blue-900">
                  Email Report Sent
                </Text>
              </View>
              <Text className="mt-2 text-sm text-blue-700">
                A copy of this report was emailed to you on{' '}
                {format(
                  parseISO(booking.report_email_sent_at),
                  "MMM d, yyyy 'at' h:mm a"
                )}
              </Text>
            </View>
          )}

          {/* Company Footer */}
          <View className="mb-6 mt-2 rounded-lg bg-gray-50 p-4">
            <Text className="mb-2 text-center text-lg font-bold text-green-600">
              RefreshLawn
            </Text>
            <Text className="text-center text-sm text-gray-600">
              Thank you for choosing our lawn care services!
            </Text>
            <Text className="mt-2 text-center text-xs text-gray-500">
              Questions? Contact us through the app or call our support team.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
