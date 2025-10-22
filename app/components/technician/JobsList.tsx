import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Calendar,
  Filter,
  Search,
  MapPin,
  Clock,
  ChevronRight,
  AlertCircle,
} from 'lucide-react-native';
import { getTechnicianBookings } from '../../../lib/data';
import { useAuth } from '../../../lib/auth';
import { parseISO } from 'date-fns';
import { useRealtimeBookings } from '../../../lib/hooks';
import { StatusBadge } from '../../components/common/StatusBadge';
import { WorkflowStatusType } from '../../../lib/constants/bookingStatus';
import {
  mapBookingToJob,
  sortJobsByPriority,
  TechnicianJob,
  getStatusSortPriority,
} from '../../../lib/technician-utils';

const JobsList = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'status'>('date');
  const [jobs, setJobs] = useState<TechnicianJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to real-time booking updates
  const { bookings: realtimeBookings } = useRealtimeBookings({
    technicianId: user?.id,
    enabled: !!user?.id,
  });

  // Initial data load
  useEffect(() => {
    if (!user?.id) return;

    const loadJobs = async () => {
      try {
        setLoading(true);
        // Get all technician bookings from Supabase
        const bookings = await getTechnicianBookings(user.id);

        // Map the bookings using shared utility function
        const mappedJobs = bookings.map(mapBookingToJob);

        setJobs(mappedJobs);
      } catch (err) {
        console.error('Error loading technician jobs:', err);
        setError('Failed to load jobs');
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, [user?.id]);

  // Update jobs when real-time updates come in
  useEffect(() => {
    if (realtimeBookings.length === 0) return;

    // Map real-time bookings using shared utility
    const mappedRealtimeJobs = realtimeBookings.map(mapBookingToJob);

    // Merge real-time updates with existing jobs
    setJobs((prevJobs) => {
      const jobMap = new Map(prevJobs.map((job) => [job.id, job]));

      // Update or add real-time jobs
      mappedRealtimeJobs.forEach((job) => {
        jobMap.set(job.id, job);
      });

      return Array.from(jobMap.values());
    });
  }, [realtimeBookings]);

  // Filter jobs based on search query and status filter
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.serviceType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterStatus
      ? job.workflowStatus === filterStatus
      : true;

    return matchesSearch && matchesFilter;
  });

  // Sort jobs based on sortBy state
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === 'date') {
      return (
        new Date(a.scheduledDate).getTime() -
        new Date(b.scheduledDate).getTime()
      );
    } else {
      // Use shared utility for status-based sorting
      return (
        getStatusSortPriority(a.workflowStatus) -
        getStatusSortPriority(b.workflowStatus)
      );
    }
  });

  const handleJobPress = (jobId: string) => {
    router.push(`/(technician)/job-details/${jobId}`);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="mt-2 text-gray-500">Loading jobs...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-4">
        <AlertCircle size={40} color="#ef4444" />
        <Text className="mt-2 text-center text-red-500">{error}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Search and Filter Bar */}
      <View className="border-b border-gray-200 bg-white p-4">
        <View className="mb-3 flex-row items-center rounded-lg bg-gray-100 px-3 py-2">
          <Search size={20} color="#6b7280" />
          <TextInput
            className="ml-2 flex-1 text-base text-gray-800"
            placeholder="Search jobs..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View className="flex-row justify-between">
          {/* Filter Buttons */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row"
          >
            <TouchableOpacity
              className={`mr-2 flex-row items-center rounded-full px-3 py-1 ${
                filterStatus === null ? 'bg-blue-500' : 'bg-gray-200'
              }`}
              onPress={() => setFilterStatus(null)}
            >
              <Text
                className={`${
                  filterStatus === null ? 'text-white' : 'text-gray-800'
                }`}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`mr-2 flex-row items-center rounded-full px-3 py-1 ${
                filterStatus === 'pending_assignment'
                  ? 'bg-blue-500'
                  : 'bg-gray-200'
              }`}
              onPress={() => setFilterStatus('pending_assignment')}
            >
              <Text
                className={`${
                  filterStatus === 'pending_assignment'
                    ? 'text-white'
                    : 'text-gray-800'
                }`}
              >
                Pending
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`mr-2 flex-row items-center rounded-full px-3 py-1 ${
                filterStatus === 'scheduled' ? 'bg-blue-500' : 'bg-gray-200'
              }`}
              onPress={() => setFilterStatus('scheduled')}
            >
              <Text
                className={`${
                  filterStatus === 'scheduled' ? 'text-white' : 'text-gray-800'
                }`}
              >
                Scheduled
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`mr-2 flex-row items-center rounded-full px-3 py-1 ${
                filterStatus === 'in_progress' ? 'bg-blue-500' : 'bg-gray-200'
              }`}
              onPress={() => setFilterStatus('in_progress')}
            >
              <Text
                className={`${
                  filterStatus === 'in_progress'
                    ? 'text-white'
                    : 'text-gray-800'
                }`}
              >
                In Progress
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`mr-2 flex-row items-center rounded-full px-3 py-1 ${
                filterStatus === 'completed' ? 'bg-blue-500' : 'bg-gray-200'
              }`}
              onPress={() => setFilterStatus('completed')}
            >
              <Text
                className={`${
                  filterStatus === 'completed' ? 'text-white' : 'text-gray-800'
                }`}
              >
                Completed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`mr-2 flex-row items-center rounded-full px-3 py-1 ${
                filterStatus === 'cancelled' ? 'bg-blue-500' : 'bg-gray-200'
              }`}
              onPress={() => setFilterStatus('cancelled')}
            >
              <Text
                className={`${
                  filterStatus === 'cancelled' ? 'text-white' : 'text-gray-800'
                }`}
              >
                Cancelled
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Sort Button */}
          <TouchableOpacity
            className="flex-row items-center rounded-full bg-gray-200 px-3 py-1"
            onPress={() => setSortBy(sortBy === 'date' ? 'status' : 'date')}
          >
            <Filter size={16} color="#4b5563" />
            <Text className="ml-1 text-gray-800">
              {sortBy === 'date' ? 'By Date' : 'By Status'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Jobs List */}
      <ScrollView className="flex-1">
        {sortedJobs.length > 0 ? (
          sortedJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              className="border-b border-gray-200 bg-white p-4"
              onPress={() => handleJobPress(job.id)}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-800">
                    {job.customerName}
                  </Text>
                  <View className="mt-1 flex-row items-center">
                    <MapPin size={16} color="#6b7280" />
                    <Text className="ml-1 flex-1 text-gray-600">
                      {job.address}
                    </Text>
                  </View>
                  <View className="mt-1 flex-row items-center">
                    <Calendar size={16} color="#6b7280" />
                    <Text className="ml-1 text-gray-600">
                      {job.scheduledDate}
                    </Text>
                    <Clock size={16} color="#6b7280" className="ml-3" />
                    <Text className="ml-1 text-gray-600">
                      {job.scheduledTime}
                    </Text>
                  </View>
                  <Text className="mt-2 text-gray-700">{job.serviceType}</Text>
                </View>
                <View className="flex-row items-center">
                  <StatusBadge
                    workflowStatus={job.workflowStatus}
                    paymentStatus={job.paymentStatus}
                    size="small"
                  />
                  <ChevronRight size={20} color="#9ca3af" className="ml-2" />
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View className="items-center justify-center p-4">
            <Text className="text-center text-gray-500">
              No jobs found matching your criteria
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default JobsList;
