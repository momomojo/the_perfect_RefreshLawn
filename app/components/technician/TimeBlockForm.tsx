import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { addTimeBlock } from '@/lib/data';
import { showNotification } from '@/lib/notification';

interface TimeBlockFormProps {
  technicianId: string;
  onSuccess: () => void;
}

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
  '21:00',
];

const QUICK_REASONS = [
  'Lunch Break',
  'Travel Time',
  'Personal Appointment',
  'Equipment Maintenance',
  'Training',
];

export default function TimeBlockForm({
  technicianId,
  onSuccess,
}: TimeBlockFormProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState<string>('12:00');
  const [endTime, setEndTime] = useState<string>('13:00');
  const [reason, setReason] = useState<string>('Lunch Break');
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

    const today = new Date().toISOString().split('T')[0];
    if (selectedDate < today) {
      showNotification({
        title: 'Invalid Date',
        message: 'Cannot block time in the past',
        type: 'error',
      });
      return;
    }

    if (!reason.trim()) {
      showNotification({
        title: 'Missing Reason',
        message: 'Please provide a reason for this block',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      await addTimeBlock(
        technicianId,
        selectedDate,
        startTime + ':00',
        endTime + ':00',
        reason
      );
      showNotification({
        title: 'Success',
        message: 'Time block added successfully',
        type: 'success',
      });

      // Reset form
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setStartTime('12:00');
      setEndTime('13:00');
      setReason('Lunch Break');

      onSuccess();
    } catch (error: any) {
      console.error('Error adding time block:', error);
      showNotification({
        title: 'Error',
        message: error.message || 'Failed to add time block',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate next 30 days
  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      dates.push({
        value: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
      });
    }
    return dates;
  };

  const dateOptions = generateDateOptions();

  return (
    <View className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <Text className="mb-4 text-lg font-semibold">Block Time</Text>

      {/* Date Selector */}
      <Text className="mb-2 text-sm font-medium text-gray-700">
        Select Date
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-4"
      >
        {dateOptions.slice(0, 14).map((date) => (
          <TouchableOpacity
            key={date.value}
            onPress={() => setSelectedDate(date.value)}
            className={`mr-2 rounded-lg px-3 py-2 ${
              selectedDate === date.value ? 'bg-red-500' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                selectedDate === date.value ? 'text-white' : 'text-gray-700'
              }`}
            >
              {date.label}
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
            style={{ maxHeight: 100 }}
            className="rounded-lg border border-gray-300"
          >
            {TIME_SLOTS.map((time) => (
              <TouchableOpacity
                key={`start-${time}`}
                onPress={() => setStartTime(time)}
                className={`p-2 ${
                  startTime === time ? 'bg-red-100' : 'bg-white'
                }`}
              >
                <Text
                  className={`text-center text-sm ${
                    startTime === time
                      ? 'font-semibold text-red-700'
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
            style={{ maxHeight: 100 }}
            className="rounded-lg border border-gray-300"
          >
            {TIME_SLOTS.map((time) => (
              <TouchableOpacity
                key={`end-${time}`}
                onPress={() => setEndTime(time)}
                className={`p-2 ${
                  endTime === time ? 'bg-red-100' : 'bg-white'
                }`}
              >
                <Text
                  className={`text-center text-sm ${
                    endTime === time
                      ? 'font-semibold text-red-700'
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

      {/* Reason Selector */}
      <Text className="mb-2 text-sm font-medium text-gray-700">Reason</Text>
      <View className="mb-3 flex-row flex-wrap">
        {QUICK_REASONS.map((quickReason) => (
          <TouchableOpacity
            key={quickReason}
            onPress={() => setReason(quickReason)}
            className={`mb-2 mr-2 rounded-full px-3 py-1 ${
              reason === quickReason ? 'bg-red-500' : 'bg-gray-200'
            }`}
          >
            <Text
              className={`text-xs ${
                reason === quickReason ? 'text-white' : 'text-gray-700'
              }`}
            >
              {quickReason}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom Reason Input */}
      <TextInput
        value={reason}
        onChangeText={setReason}
        placeholder="Custom reason..."
        className="mb-4 rounded-lg border border-gray-300 px-3 py-2"
      />

      {/* Summary */}
      <View className="mb-4 rounded-lg bg-gray-50 p-3">
        <Text className="text-sm text-gray-600">
          Blocking{' '}
          <Text className="font-semibold text-gray-900">
            {dateOptions.find((d) => d.value === selectedDate)?.label}
          </Text>{' '}
          from <Text className="font-semibold text-gray-900">{startTime}</Text>{' '}
          to <Text className="font-semibold text-gray-900">{endTime}</Text>
        </Text>
        <Text className="mt-1 text-xs text-gray-500">Reason: {reason}</Text>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={loading}
        className={`rounded-lg py-3 ${loading ? 'bg-gray-400' : 'bg-red-500'}`}
      >
        <Text className="text-center font-semibold text-white">
          {loading ? 'Blocking...' : 'Block Time'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
