import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Button,
  Platform,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import {
  ArrowLeft,
  MapPin,
  AlertCircle,
  Camera,
  Upload,
} from 'lucide-react-native';
import JobDetail from '../../components/technician/JobDetail';
import JobStatusUpdater from '../../components/technician/JobStatusUpdater';
import {
  getBooking,
  updateBookingStatus,
  WorkflowStatus,
} from '../../../lib/data';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../lib/auth';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../../lib/supabase';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { showNotification } from '../../../lib/notification';
import { useRealtimeBookings } from '../../../lib/hooks';
import { optimisticValueUpdate } from '../../../lib/optimistic-updates';
import { WorkflowStatusType } from '../../../lib/constants/bookingStatus';
import ErrorBoundary from '../../components/common/ErrorBoundary';

function JobDetailsScreenContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobData, setJobData] = useState<any>(null);
  const [currentStatus, setCurrentStatus] =
    useState<WorkflowStatusType>('scheduled');

  // Real-time subscription for this specific job
  const { bookings: realtimeBookings } = useRealtimeBookings({
    bookingId: id as string,
    enabled: !!id,
  });

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showNotification({
            title: 'Permission Denied',
            message:
              'Sorry, we need camera roll permissions to make this work!',
            type: 'error',
          });
        }
      }
    })();

    if (!id) return;

    const fetchBookingDetails = async () => {
      try {
        console.log(
          `[JobDetailsScreen] fetchBookingDetails started for id: ${id}`
        );
        setLoading(true);
        console.log('[JobDetailsScreen] Calling getBooking...');
        const booking = await getBooking(id as string);
        console.log('[JobDetailsScreen] getBooking returned:', booking);

        if (!booking) {
          console.log('[JobDetailsScreen] Booking not found, setting error.');
          setError('Booking not found.');
          setLoading(false);
          return;
        }
        console.log('[JobDetailsScreen] Booking found, setting status...');
        setCurrentStatus(booking.workflow_status);
        console.log('[JobDetailsScreen] Setting job data...');
        setJobData({
          jobId: booking.id,
          customerName: `${booking.customer?.first_name} ${booking.customer?.last_name}`,
          customerPhone: booking.customer?.phone || '',
          address:
            booking.address ||
            (booking.customer?.address
              ? `${booking.customer.address}, ${booking.customer.city}, ${booking.customer.state} ${booking.customer.zip_code}`
              : ''),
          serviceType: booking.service?.name || '',
          scheduledDate: format(
            new Date(booking.scheduled_date),
            'MMMM d, yyyy'
          ),
          scheduledTime: format(
            new Date(`2000-01-01T${booking.scheduled_time}`),
            'h:mm a'
          ),
          estimatedDuration: booking.service?.duration_minutes
            ? `${booking.service.duration_minutes} minutes`
            : 'Not specified',
          propertySize: 'Not specified',
          specialInstructions: booking.notes || '',
          propertyImage:
            'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80',
          workflowStatus: booking.workflow_status,
          paymentStatus: booking.payment_status,
        });
        console.log('[JobDetailsScreen] Job data set.');
      } catch (err) {
        console.error('Error fetching booking details:', err);
        console.log(
          '[JobDetailsScreen] Error caught in fetchBookingDetails:',
          err
        );
        setError('Failed to load booking details');
      } finally {
        console.log(
          '[JobDetailsScreen] Entering finally block, setting loading to false.'
        );
        setLoading(false);
      }
    };
    fetchBookingDetails();
  }, [id]);

  // Update job when real-time changes occur
  useEffect(() => {
    if (realtimeBookings.length > 0 && realtimeBookings[0].id === id) {
      const booking = realtimeBookings[0];
      console.log('Real-time update received for job:', booking);

      setCurrentStatus(booking.workflow_status);
      setJobData({
        jobId: booking.id,
        customerName: `${booking.customer?.first_name} ${booking.customer?.last_name}`,
        customerPhone: booking.customer?.phone || '',
        address:
          booking.address ||
          (booking.customer?.address
            ? `${booking.customer.address}, ${booking.customer.city}, ${booking.customer.state} ${booking.customer.zip_code}`
            : ''),
        serviceType: booking.service?.name || '',
        scheduledDate: format(new Date(booking.scheduled_date), 'MMMM d, yyyy'),
        scheduledTime: format(
          new Date(`2000-01-01T${booking.scheduled_time}`),
          'h:mm a'
        ),
        estimatedDuration: booking.service?.duration_minutes
          ? `${booking.service.duration_minutes} minutes`
          : 'Not specified',
        propertySize: 'Not specified',
        specialInstructions: booking.notes || '',
        propertyImage:
          'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80',
        workflowStatus: booking.workflow_status,
        paymentStatus: booking.payment_status,
      });
    }
  }, [realtimeBookings, id]);

  const handleStatusUpdate = async (status: string, data?: any) => {
    if (!user || !user.id) {
      showNotification({
        title: 'Error',
        message: 'No authenticated user found.',
        type: 'error',
      });
      return;
    }

    if (!jobData) {
      showNotification({
        title: 'Error',
        message: 'Job data not available.',
        type: 'error',
      });
      return;
    }

    // Extract notes if status is completed
    const reportNotes = status === 'completed' ? data?.notes : undefined;

    // Use optimistic update for instant UI feedback
    await optimisticValueUpdate({
      currentValue: jobData,
      setValue: setJobData,
      optimisticValue: {
        ...jobData,
        workflowStatus: status,
      },
      operation: async () => {
        // Also update currentStatus immediately
        setCurrentStatus(status as WorkflowStatusType);

        // Perform the actual status update
        await updateBookingStatus(
          id as string,
          status as any,
          user.id,
          reportNotes
        );
      },
      onSuccess: () => {
        console.log(`[OptimisticUpdate] Status updated to ${status}`);

        if (status === 'completed') {
          // Show success notification
          showNotification({
            title: 'Job Completed Successfully',
            message: 'Your job report has been submitted.',
            type: 'success',
          });
          // Immediately redirect to the jobs list
          router.replace('/(technician)/jobs');
        } else {
          // Show notification for other status updates
          showNotification({
            title: 'Status Updated',
            message: `Job status changed to ${status}.`,
            type: 'info',
          });
        }
      },
      onError: (error) => {
        console.error('Error updating booking status:', error);
        showNotification({
          title: 'Error',
          message: `Failed to update job status: ${error.message}. Please try again.`,
          type: 'error',
        });
        // Status will automatically rollback to previous value
      },
    });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="mt-2 text-gray-500">Loading job details...</Text>
      </View>
    );
  }

  if (error || !jobData) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-4">
        <AlertCircle size={40} color="#ef4444" />
        <Text className="mt-2 text-center text-red-500">
          {error || 'Job not found'}
        </Text>
        <TouchableOpacity
          className="mt-4 rounded-lg bg-blue-500 px-4 py-2"
          onPress={() => router.push('/(technician)/jobs')}
        >
          <Text className="font-medium text-white">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerTitle: `Job #${id?.substring(0, 8)}...`,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.push('/(technician)/jobs')}
              className="mr-4"
            >
              <ArrowLeft size={24} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              try {
                setRefreshing(true);
                const booking = await getBooking(id as string);
                if (booking) {
                  setCurrentStatus(booking.workflow_status);
                  setJobData({
                    jobId: booking.id,
                    customerName: `${booking.customer?.first_name} ${booking.customer?.last_name}`,
                    customerPhone: booking.customer?.phone || '',
                    address:
                      booking.address ||
                      (booking.customer?.address
                        ? `${booking.customer.address}, ${booking.customer.city}, ${booking.customer.state} ${booking.customer.zip_code}`
                        : ''),
                    serviceType: booking.service?.name || '',
                    scheduledDate: format(
                      new Date(booking.scheduled_date),
                      'MMMM d, yyyy'
                    ),
                    scheduledTime: format(
                      new Date(`2000-01-01T${booking.scheduled_time}`),
                      'h:mm a'
                    ),
                    estimatedDuration: booking.service?.duration_minutes
                      ? `${booking.service.duration_minutes} minutes`
                      : 'Not specified',
                    propertySize: 'Not specified',
                    specialInstructions: booking.notes || '',
                    propertyImage:
                      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80',
                    workflowStatus: booking.workflow_status,
                    paymentStatus: booking.payment_status,
                  });
                }
              } catch (err) {
                console.error('Error refreshing job:', err);
              } finally {
                setRefreshing(false);
              }
            }}
            colors={['#16a34a']}
            tintColor="#16a34a"
          />
        }
      >
        <View className="p-4">
          {/* Navigation indicator */}
          <View className="mb-4 flex-row items-center">
            <MapPin size={16} color="#6b7280" />
            <Text className="ml-1 text-gray-500">Job Details</Text>
          </View>
          {/* Job Details Component - Pass auth email */}
          <JobDetail {...jobData} customerAuthEmail={user?.email} />

          {/* Job Status Updater */}
          <JobStatusUpdater
            jobId={jobData.jobId}
            currentStatus={currentStatus}
            onStatusUpdate={handleStatusUpdate}
          />
        </View>
      </ScrollView>
    </View>
  );
}

export default function JobDetailsScreen() {
  return (
    <ErrorBoundary fallbackMessage="Job Details Error">
      <JobDetailsScreenContent />
    </ErrorBoundary>
  );
}
