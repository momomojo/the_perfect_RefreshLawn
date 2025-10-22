import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { getCustomerBookings } from '../../lib/data';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { Linking } from 'react-native';
import { showNotification } from '../../lib/notification';
import { WebView } from 'react-native-webview';
import { FileText } from 'lucide-react-native';
import { StatusBadge } from '../components/common/StatusBadge';

export default function HistoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  // Receipt modal state
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchBookingHistory();
  }, []);

  const fetchBookingHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        setError('You must be logged in to view booking history');
        setLoading(false);
        return;
      }

      const userId = session.session.user.id;

      // Fetch booking history
      const data = await getCustomerBookings(userId);

      setBookings(data.data || []);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      console.error('Error fetching booking history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'EEE, MMM d, yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      return format(new Date(`2000-01-01T${timeStr}`), 'h:mm a');
    } catch (e) {
      return timeStr;
    }
  };

  // Handler to fetch and open the Stripe receipt URL
  const handleViewReceipt = async (paymentIntentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'stripe-payment-api',
        { body: { path: 'get-receipt-url', payload: { paymentIntentId } } }
      );
      if (error) throw error;
      if (data?.receiptUrl) {
        // Platform-specific receipt viewing
        if (Platform.OS === 'web') {
          // On web, open in new tab
          window.open(data.receiptUrl, '_blank');
        } else {
          // On native, show in-app WebView modal
          setReceiptUrl(data.receiptUrl);
        }
      } else {
        showNotification({
          title: 'Error',
          message: 'Receipt not available',
          type: 'error',
        });
      }
    } catch (err: any) {
      console.error('Error fetching receipt URL:', err);
      showNotification({
        title: 'Error',
        message: err.message || 'Failed to fetch receipt',
        type: 'error',
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#16a34a" />
        <Text className="mt-4 text-gray-600">Loading service history...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white p-4">
        <Text className="mb-4 text-center text-lg text-red-500">{error}</Text>
        <TouchableOpacity
          className="rounded-lg bg-green-600 px-4 py-2"
          onPress={fetchBookingHistory}
        >
          <Text className="font-semibold text-white">Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <>
      {receiptUrl && (
        <Modal
          visible
          animationType="slide"
          onRequestClose={() => setReceiptUrl(null)}
        >
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              onPress={() => setReceiptUrl(null)}
              style={{ padding: 16 }}
            >
              <Text style={{ color: '#06d6a0', fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
            <WebView source={{ uri: receiptUrl! }} style={{ flex: 1 }} />
          </View>
        </Modal>
      )}
      <SafeAreaView className="flex-1 bg-gray-50">
        <Stack.Screen
          options={{
            title: 'Service History',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: 'white' },
            headerTitleAlign: 'center',
          }}
        />
        <ScrollView className="flex-1 p-4">
          {bookings.length === 0 ? (
            <View className="mt-20 flex-1 items-center justify-center">
              <Text className="text-center text-gray-500">
                No booking history found.
              </Text>
            </View>
          ) : (
            bookings.map((item) => (
              <TouchableOpacity
                key={item.id}
                className="mb-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm active:bg-gray-100"
                onPress={() =>
                  router.push(`/(customer)/booking-details/${item.id}`)
                }
              >
                <Text className="mb-1 text-lg font-semibold text-gray-800">
                  {item.service?.name || 'Unknown Service'}
                </Text>
                <Text className="mb-1 text-gray-600">
                  {formatDate(item.scheduled_date)} at{' '}
                  {formatTime(item.scheduled_time)}
                </Text>

                {/* Hybrid Status Display */}
                <View className="mb-2 mt-1 flex-row items-center">
                  <StatusBadge
                    paymentStatus={item.payment_status}
                    workflowStatus={item.workflow_status}
                    showBoth
                    size="small"
                  />
                </View>

                <Text className="text-sm font-semibold text-gray-500">
                  Price: ${parseFloat(item.price?.toString() || '0').toFixed(2)}
                </Text>
                {item.address && (
                  <Text className="mt-1 text-xs text-gray-400">
                    {item.address}
                  </Text>
                )}
                {item.stripe_payment_intent_id && (
                  <View className="mt-2 border-t border-gray-100 pt-1">
                    <Text className="text-xs text-gray-500">
                      Payment Ref: {item.stripe_payment_intent_id}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        handleViewReceipt(item.stripe_payment_intent_id)
                      }
                    >
                      <Text className="mt-1 text-xs font-semibold text-blue-500">
                        View Receipt
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                {/* View Job Report button for completed jobs */}
                {item.workflow_status === 'completed' && (
                  <TouchableOpacity
                    className="mt-3 flex-row items-center justify-center rounded-lg border border-green-200 bg-green-50 px-3 py-2"
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/(customer)/job-report/${item.id}`);
                    }}
                  >
                    <FileText size={16} color="#16a34a" />
                    <Text className="ml-2 text-sm font-semibold text-green-700">
                      View Job Report
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
