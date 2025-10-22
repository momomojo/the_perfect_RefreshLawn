import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { setTechnicianAvailability, TechnicianAvailability } from '@/lib/data';
import { showNotification } from '@/lib/notification';

interface AvailabilityFormProps {
  technicianId: string;
  existingAvailability?: TechnicianAvailability[];
  onSuccess: () => void;
}

const DAYS = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];

const TIME_SLOTS = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
];

export default function AvailabilityForm({
  technicianId,
  existingAvailability = [],
  onSuccess,
}: AvailabilityFormProps) {
  const [selectedDay, setSelectedDay] = useState<number>(1); // Default Monday
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (startTime >= endTime) {
      showNotification({
        title: 'Invalid Time Range',
        message: 'End time must be after start time',
        type: 'error',
      });
      return;
    }

    // Check if this day/time already exists
    const exists = existingAvailability.some(
      (avail) =>
        avail.day_of_week === selectedDay &&
        avail.start_time === startTime + ':00' &&
        avail.end_time === endTime + ':00'
    );

    if (exists) {
      showNotification({
        title: 'Already Exists',
        message: 'This availability window already exists',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      await setTechnicianAvailability(
        technicianId,
        selectedDay,
        startTime + ':00',
        endTime + ':00'
      );
      showNotification({
        title: 'Success',
        message: 'Availability added successfully',
        type: 'success',
      });
      onSuccess();
    } catch (error: any) {
      console.error('Error setting availability:', error);
      showNotification({
        title: 'Error',
        message: error.message || 'Failed to set availability',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <Text className="mb-4 text-lg font-semibold">Add Availability</Text>

      {/* Day Selector */}
      <Text className="mb-2 text-sm font-medium text-gray-700">Select Day</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-4"
      >
        {DAYS.map((day) => (
          <TouchableOpacity
            key={day.value}
            onPress={() => setSelectedDay(day.value)}
            className={`mr-2 rounded-lg px-4 py-2 ${
              selectedDay === day.value ? 'bg-green-500' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`font-medium ${
                selectedDay === day.value ? 'text-white' : 'text-gray-700'
              }`}
            >
              {day.label.substring(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Time Selection */}
      <View className="mb-4 flex-row justify-between">
        <View className="mr-2 flex-1">
          <Text className="mb-2 text-sm font-medium text-gray-700">
            Start Time
          </Text>
          <ScrollView
            style={{ maxHeight: 120 }}
            className="rounded-lg border border-gray-300"
          >
            {TIME_SLOTS.map((time) => (
              <TouchableOpacity
                key={`start-${time}`}
                onPress={() => setStartTime(time)}
                className={`p-3 ${
                  startTime === time ? 'bg-green-100' : 'bg-white'
                }`}
              >
                <Text
                  className={`text-center ${
                    startTime === time
                      ? 'font-semibold text-green-700'
                      : 'text-gray-700'
                  }`}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View className="ml-2 flex-1">
          <Text className="mb-2 text-sm font-medium text-gray-700">
            End Time
          </Text>
          <ScrollView
            style={{ maxHeight: 120 }}
            className="rounded-lg border border-gray-300"
          >
            {TIME_SLOTS.map((time) => (
              <TouchableOpacity
                key={`end-${time}`}
                onPress={() => setEndTime(time)}
                className={`p-3 ${
                  endTime === time ? 'bg-green-100' : 'bg-white'
                }`}
              >
                <Text
                  className={`text-center ${
                    endTime === time
                      ? 'font-semibold text-green-700'
                      : 'text-gray-700'
                  }`}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Summary */}
      <View className="mb-4 rounded-lg bg-gray-50 p-3">
        <Text className="text-sm text-gray-600">
          You will be available on{' '}
          <Text className="font-semibold text-gray-900">
            {DAYS.find((d) => d.value === selectedDay)?.label}s
          </Text>{' '}
          from <Text className="font-semibold text-gray-900">{startTime}</Text>{' '}
          to <Text className="font-semibold text-gray-900">{endTime}</Text>
        </Text>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={loading}
        className={`rounded-lg py-3 ${
          loading ? 'bg-gray-400' : 'bg-green-500'
        }`}
      >
        <Text className="text-center font-semibold text-white">
          {loading ? 'Adding...' : 'Add Availability'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
