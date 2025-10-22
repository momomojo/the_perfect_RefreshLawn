import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MapPin, Clock, ChevronRight, CheckCircle } from 'lucide-react-native';
import { getTechnicianBookings, Booking } from '../../../lib/data';
import { useAuth } from '../../../lib/auth';
import { format, parseISO } from 'date-fns';
import { useRealtimeBookings } from '../../../lib/hooks';
import { StatusBadge } from '../common/StatusBadge';
import { WorkflowStatusType } from '../../../lib/constants/bookingStatus';

interface Job {
  id: string;
  customerName: string;
  address: string;
  time: string;
  serviceType: string;
  workflowStatus: WorkflowStatusType;
  propertyImage?: string;
  createdAt: string;
}

interface TodayJobsProps {
  onJobSelect?: (jobId: string) => void;
}

const TodayJobs = ({
  onJobSelect = (jobId) => console.log(`Job ${jobId} selected`),
}: TodayJobsProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const [activeFilter, setActiveFilter] = useState<'all' | WorkflowStatusType>(
    'all'
  );

  // Subscribe to real-time booking updates for this technician
  const { bookings: realtimeBookings } = useRealtimeBookings({
    technicianId: user?.id,
    enabled: !!user?.id,
  });

  // Initial data load
  useEffect(() => {
    if (!user?.id) {
      console.log('[TodayJobs] No user ID yet—skipping load');
      setLoading(false);
      return;
    }

    const loadTodayJobs = async () => {
      try {
        setLoading(true);
        // Get all technician bookings from Supabase
        const bookings = await getTechnicianBookings(user.id);

        // Filter for today's jobs only
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const todaysBookings = bookings.filter(
          (booking) => booking.scheduled_date === today
        );

        // Map the bookings to the Job interface format
        const mappedJobs = todaysBookings.map((booking) => ({
          id: booking.id,
          customerName:
            booking.customer?.first_name + ' ' + booking.customer?.last_name,
          address: booking.address || '',
          time: `${format(
            new Date(`2000-01-01T${booking.scheduled_time}`),
            'h:mm a'
          )}`,
          serviceType: booking.service?.name || '',
          workflowStatus: booking.workflow_status,
          propertyImage:
            'https://images.unsplash.com/photo-1560749003-f4b1e17e2dfd?w=400&q=80', // Default image
          createdAt: booking.created_at,
        }));

        setJobs(mappedJobs);
      } catch (err) {
        console.error('Error loading technician jobs:', err);
        setError('Failed to load jobs');
      } finally {
        setLoading(false);
      }
    };

    loadTodayJobs();
  }, [user?.id]);

  // Update jobs when real-time updates come in (filter for today only)
  useEffect(() => {
    if (realtimeBookings.length === 0) return;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Filter real-time bookings for today only
    const todaysRealtimeBookings = realtimeBookings.filter(
      (booking) => booking.scheduled_date === today
    );

    // Map real-time bookings to Job format
    const mappedRealtimeJobs = todaysRealtimeBookings.map((booking) => ({
      id: booking.id,
      customerName:
        booking.customer?.first_name + ' ' + booking.customer?.last_name,
      address: booking.address || '',
      time: `${format(
        new Date(`2000-01-01T${booking.scheduled_time}`),
        'h:mm a'
      )}`,
      serviceType: booking.service?.name || '',
      workflowStatus: booking.workflow_status,
      propertyImage:
        'https://images.unsplash.com/photo-1560749003-f4b1e17e2dfd?w=400&q=80',
      createdAt: booking.created_at,
    }));

    // Merge real-time updates with existing jobs
    setJobs((prevJobs) => {
      const jobMap = new Map(prevJobs.map((job) => [job.id, job]));

      // Update or add real-time jobs
      mappedRealtimeJobs.forEach((job) => {
        jobMap.set(job.id, job);
      });

      // Remove jobs that are no longer for today
      return Array.from(jobMap.values()).filter((job) => {
        const matchingBooking = realtimeBookings.find((b) => b.id === job.id);
        return matchingBooking
          ? matchingBooking.scheduled_date === today
          : true;
      });
    });
  }, [realtimeBookings]);

  const filteredJobs =
    activeFilter === 'all'
      ? jobs
      : jobs.filter((job) => job.workflowStatus === activeFilter);

  if (loading) {
    return (
      <View
        className="items-center justify-center rounded-lg bg-white p-4 shadow-sm"
        style={{ height: 150 }}
      >
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="mt-2 text-gray-500">Loading jobs...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="rounded-lg bg-white p-4 shadow-sm">
        <Text className="text-center text-red-500">{error}</Text>
      </View>
    );
  }

  return (
    <View className="rounded-lg bg-white p-4 shadow-sm">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-gray-800">Today's Jobs</Text>
        <View className="flex-row rounded-full bg-gray-100 p-1">
          <TouchableOpacity
            onPress={() => setActiveFilter('all')}
            className={`rounded-full px-3 py-1 ${
              activeFilter === 'all' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Text
              className={`${
                activeFilter === 'all' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveFilter('pending_assignment')}
            className={`rounded-full px-3 py-1 ${
              activeFilter === 'pending_assignment' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Text
              className={`${
                activeFilter === 'pending_assignment'
                  ? 'text-blue-600'
                  : 'text-gray-600'
              }`}
            >
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveFilter('in_progress')}
            className={`rounded-full px-3 py-1 ${
              activeFilter === 'in_progress' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Text
              className={`${
                activeFilter === 'in_progress'
                  ? 'text-blue-600'
                  : 'text-gray-600'
              }`}
            >
              In Progress
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveFilter('completed')}
            className={`rounded-full px-3 py-1 ${
              activeFilter === 'completed' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Text
              className={`${
                activeFilter === 'completed' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              Completed
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {filteredJobs.length === 0 ? (
        <View className="items-center justify-center py-8">
          <Text className="text-center text-gray-500">
            No jobs found for the selected filter.
          </Text>
        </View>
      ) : (
        <ScrollView className="max-h-96">
          {filteredJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              className="mb-3 overflow-hidden rounded-lg border border-gray-200 bg-white"
              onPress={() => onJobSelect(job.id)}
            >
              <View className="flex-row">
                <Image
                  source={{ uri: job.propertyImage }}
                  className="h-full w-24"
                  style={{ height: 100 }}
                />
                <View className="flex-1 p-3">
                  <View className="flex-row items-start justify-between">
                    <Text className="text-lg font-semibold text-gray-800">
                      {job.serviceType}
                    </Text>
                    <StatusBadge
                      workflowStatus={job.workflowStatus}
                      size="small"
                    />
                  </View>
                  <Text className="mt-1 text-gray-600">{job.customerName}</Text>
                  <View className="mt-2 flex-row items-center">
                    <MapPin size={14} color="#6b7280" />
                    <Text
                      className="ml-1 text-xs text-gray-500"
                      numberOfLines={1}
                    >
                      {job.address}
                    </Text>
                  </View>
                  <View className="mt-1 flex-row items-center">
                    <Clock size={14} color="#6b7280" />
                    <Text className="ml-1 text-xs text-gray-500">
                      {job.time}
                    </Text>
                  </View>
                  <View className="mt-1">
                    <Text className="text-xs text-gray-400">
                      Booked:{' '}
                      {format(parseISO(job.createdAt), "MMM d 'at' h:mm a")}
                    </Text>
                  </View>
                </View>
                <View className="justify-center pr-2">
                  <ChevronRight size={20} color="#9ca3af" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View className="mt-4 border-t border-gray-200 pt-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <CheckCircle size={16} color="#10b981" />
            <Text className="ml-1 font-medium text-gray-700">
              {jobs.filter((job) => job.workflowStatus === 'completed').length}{' '}
              of {jobs.length} completed
            </Text>
          </View>
          <TouchableOpacity>
            <Text className="font-medium text-blue-600">View All Jobs</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default TodayJobs;
