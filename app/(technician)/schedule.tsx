import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import {
  getTechnicianAvailability,
  getTechnicianTimeBlocks,
  deleteTechnicianAvailability,
  removeTimeBlock,
  TechnicianAvailability,
  TechnicianTimeBlock,
  toggleAcceptingBookings,
  getAcceptingBookingsStatus,
  applySchedulePreset,
  copyWeekPattern,
  pasteWeekPattern,
  getScheduleSummary,
} from '@/lib/data';
import AvailabilityForm from '@/app/components/technician/AvailabilityForm';
import TimeBlockForm from '@/app/components/technician/TimeBlockForm';
import { showNotification } from '@/lib/notification';
import { useConfirmation } from '@/lib/confirmation';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TechnicianSchedule() {
  const { user } = useAuth();
  const { showConfirmation } = useConfirmation();
  const [availability, setAvailability] = useState<TechnicianAvailability[]>(
    []
  );
  const [timeBlocks, setTimeBlocks] = useState<TechnicianTimeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
  const [showTimeBlockForm, setShowTimeBlockForm] = useState(false);

  // New state for enhanced features
  const [isAcceptingBookings, setIsAcceptingBookings] = useState(true);
  const [copiedPattern, setCopiedPattern] = useState<any[]>([]);
  const [scheduleSummary, setScheduleSummary] = useState<any>(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [presetLoading, setPresetLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadScheduleData();
    }
  }, [user?.id]);

  const loadScheduleData = async () => {
    try {
      if (!user?.id) return;

      const [availData, blocksData, acceptingStatus, summary] =
        await Promise.all([
          getTechnicianAvailability(user.id),
          getTechnicianTimeBlocks(user.id),
          getAcceptingBookingsStatus(user.id),
          getScheduleSummary(user.id),
        ]);

      setAvailability(availData);
      setTimeBlocks(blocksData);
      setIsAcceptingBookings(acceptingStatus);
      setScheduleSummary(summary);
    } catch (error) {
      console.error('Error loading schedule:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to load schedule data',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadScheduleData();
  };

  const handleDeleteAvailability = async (id: string) => {
    showConfirmation({
      title: 'Delete Availability',
      message: 'Are you sure you want to remove this availability window?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmButtonStyle: 'destructive',
      onConfirm: async () => {
        try {
          await deleteTechnicianAvailability(id);
          showNotification({
            title: 'Success',
            message: 'Availability removed',
            type: 'success',
          });
          loadScheduleData();
        } catch (error: any) {
          showNotification({
            title: 'Error',
            message: error.message || 'Failed to delete',
            type: 'error',
          });
        }
      },
    });
  };

  const handleDeleteTimeBlock = async (id: string) => {
    showConfirmation({
      title: 'Delete Time Block',
      message: 'Are you sure you want to remove this time block?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmButtonStyle: 'destructive',
      onConfirm: async () => {
        try {
          await removeTimeBlock(id);
          showNotification({
            title: 'Success',
            message: 'Time block removed',
            type: 'success',
          });
          loadScheduleData();
        } catch (error: any) {
          showNotification({
            title: 'Error',
            message: error.message || 'Failed to delete',
            type: 'error',
          });
        }
      },
    });
  };

  // New Handlers for Enhanced Features

  const handleToggleAccepting = async (value: boolean) => {
    if (!user?.id) return;

    setToggleLoading(true);
    try {
      await toggleAcceptingBookings(user.id, value);
      setIsAcceptingBookings(value);
      showNotification({
        title: value ? "You're Now Available" : "You're Now Offline",
        message: value
          ? "You'll start receiving booking assignments"
          : "You won't receive new bookings until you turn this back on",
        type: 'success',
      });
    } catch (error: any) {
      showNotification({
        title: 'Error',
        message: error.message || 'Failed to update status',
        type: 'error',
      });
      setIsAcceptingBookings(!value); // Revert on error
    } finally {
      setToggleLoading(false);
    }
  };

  const handleApplyPreset = async (
    presetType: 'standard' | 'weekend' | 'fullWeek' | 'clear'
  ) => {
    if (!user?.id) return;

    const presetNames = {
      standard: 'Standard Hours (Mon-Fri 9am-5pm)',
      weekend: 'Weekend Hours (Sat-Sun 8am-6pm)',
      fullWeek: 'Full Week (Every day 8am-6pm)',
      clear: 'Clear All Availability',
    };

    showConfirmation({
      title: 'Apply Preset',
      message: `Are you sure you want to apply: ${presetNames[presetType]}?${
        presetType !== 'clear'
          ? '\n\nThis will ADD to your existing availability.'
          : '\n\nThis will REMOVE all your current availability!'
      }`,
      confirmText: 'Apply',
      cancelText: 'Cancel',
      confirmButtonStyle: presetType === 'clear' ? 'destructive' : 'default',
      onConfirm: async () => {
        setPresetLoading(true);
        try {
          await applySchedulePreset(user.id, presetType);
          await loadScheduleData();
          showNotification({
            title: 'Preset Applied',
            message: `Successfully applied ${presetNames[presetType]}`,
            type: 'success',
          });
        } catch (error: any) {
          showNotification({
            title: 'Error',
            message: error.message || 'Failed to apply preset',
            type: 'error',
          });
        } finally {
          setPresetLoading(false);
        }
      },
    });
  };

  const handleCopyWeek = async () => {
    if (!user?.id) return;

    try {
      const pattern = await copyWeekPattern(user.id);
      if (!pattern || pattern.length === 0) {
        showNotification({
          title: 'Nothing to Copy',
          message: "You don't have any availability set to copy",
          type: 'error',
        });
        return;
      }
      setCopiedPattern(pattern);
      showNotification({
        title: 'Week Copied',
        message: `Copied ${pattern.length} availability windows`,
        type: 'success',
      });
    } catch (error: any) {
      showNotification({
        title: 'Error',
        message: error.message || 'Failed to copy week pattern',
        type: 'error',
      });
    }
  };

  const handlePasteWeek = async () => {
    if (!user?.id) return;

    if (copiedPattern.length === 0) {
      showNotification({
        title: 'Nothing to Paste',
        message: "Copy a week pattern first using the 'Copy Week' button",
        type: 'error',
      });
      return;
    }

    showConfirmation({
      title: 'Paste Week Pattern',
      message: `This will ADD ${copiedPattern.length} availability windows from your copied pattern.\n\nContinue?`,
      confirmText: 'Paste',
      cancelText: 'Cancel',
      confirmButtonStyle: 'default',
      onConfirm: async () => {
        try {
          await pasteWeekPattern(user.id, copiedPattern);
          await loadScheduleData();
          showNotification({
            title: 'Pattern Pasted',
            message: `Successfully added ${copiedPattern.length} availability windows`,
            type: 'success',
          });
        } catch (error: any) {
          showNotification({
            title: 'Error',
            message: error.message || 'Failed to paste pattern',
            type: 'error',
          });
        }
      },
    });
  };

  const formatTime = (time: string) => {
    // Convert HH:MM:SS to HH:MM AM/PM
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Group availability by day
  const availabilityByDay = DAYS.map((day, index) => ({
    day,
    dayIndex: index,
    windows: availability.filter((a) => a.day_of_week === index),
  }));

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loading schedule...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View className="border-b border-gray-200 bg-white p-4">
          <Text className="text-2xl font-bold text-gray-900">My Schedule</Text>
          <Text className="mt-1 text-sm text-gray-600">
            Manage your availability and time blocks
          </Text>
        </View>

        <View className="p-4">
          {/* Available Now Toggle - DoorDash Style */}
          <View className="mb-4 rounded-xl border-2 border-green-200 bg-white p-4 shadow-md">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900">
                  {isAcceptingBookings ? '🟢 Available Now' : '🔴 Offline'}
                </Text>
                <Text className="mt-1 text-sm text-gray-600">
                  {isAcceptingBookings
                    ? "You're accepting new bookings"
                    : "You won't receive new bookings"}
                </Text>
              </View>
              {toggleLoading ? (
                <ActivityIndicator size="small" color="#22c55e" />
              ) : (
                <Switch
                  value={isAcceptingBookings}
                  onValueChange={handleToggleAccepting}
                  trackColor={{ false: '#d1d5db', true: '#10b981' }}
                  thumbColor={isAcceptingBookings ? '#22c55e' : '#f3f4f6'}
                />
              )}
            </View>
          </View>

          {/* Schedule Summary Stats */}
          {scheduleSummary && scheduleSummary.totalWindows > 0 && (
            <View className="mb-4 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-blue-50 p-4">
              <Text className="mb-3 text-lg font-bold text-gray-900">
                📊 Your Schedule Summary
              </Text>
              <View className="flex-row flex-wrap">
                <View className="mb-2 w-1/2">
                  <Text className="text-2xl font-bold text-green-600">
                    {scheduleSummary.totalHoursPerWeek}h
                  </Text>
                  <Text className="text-xs text-gray-600">Per week</Text>
                </View>
                <View className="mb-2 w-1/2">
                  <Text className="text-2xl font-bold text-blue-600">
                    {scheduleSummary.daysWithAvailability}/7
                  </Text>
                  <Text className="text-xs text-gray-600">Days available</Text>
                </View>
                <View className="w-full">
                  <Text className="text-sm text-gray-700">
                    <Text className="font-semibold">Most available:</Text>{' '}
                    {scheduleSummary.mostAvailableDays}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Quick Setup Presets */}
          <View className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <Text className="mb-3 text-lg font-semibold text-gray-900">
              ⚡ Quick Setup
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <TouchableOpacity
                onPress={() => handleApplyPreset('standard')}
                disabled={presetLoading}
                className="min-w-[45%] flex-1 rounded-lg bg-blue-500 px-4 py-2"
              >
                <Text className="text-center text-sm font-medium text-white">
                  Standard Hours
                </Text>
                <Text className="text-center text-xs text-white opacity-80">
                  Mon-Fri 9-5
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleApplyPreset('weekend')}
                disabled={presetLoading}
                className="min-w-[45%] flex-1 rounded-lg bg-purple-500 px-4 py-2"
              >
                <Text className="text-center text-sm font-medium text-white">
                  Weekend
                </Text>
                <Text className="text-center text-xs text-white opacity-80">
                  Sat-Sun 8-6
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleApplyPreset('fullWeek')}
                disabled={presetLoading}
                className="min-w-[45%] flex-1 rounded-lg bg-green-500 px-4 py-2"
              >
                <Text className="text-center text-sm font-medium text-white">
                  Full Week
                </Text>
                <Text className="text-center text-xs text-white opacity-80">
                  Every day 8-6
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleApplyPreset('clear')}
                disabled={presetLoading}
                className="min-w-[45%] flex-1 rounded-lg bg-red-500 px-4 py-2"
              >
                <Text className="text-center text-sm font-medium text-white">
                  Clear All
                </Text>
                <Text className="text-center text-xs text-white opacity-80">
                  Remove all
                </Text>
              </TouchableOpacity>
            </View>
            {presetLoading && (
              <View className="mt-3 flex-row items-center justify-center">
                <ActivityIndicator size="small" color="#22c55e" />
                <Text className="ml-2 text-sm text-gray-600">
                  Applying preset...
                </Text>
              </View>
            )}
          </View>

          {/* Copy/Paste Week Pattern */}
          <View className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <Text className="mb-3 text-lg font-semibold text-gray-900">
              📋 Copy/Paste Schedule
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={handleCopyWeek}
                className="flex-1 rounded-lg bg-indigo-500 px-4 py-3"
              >
                <Text className="text-center font-medium text-white">
                  📋 Copy Week
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePasteWeek}
                disabled={copiedPattern.length === 0}
                className={`flex-1 rounded-lg px-4 py-3 ${
                  copiedPattern.length > 0 ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <Text className="text-center font-medium text-white">
                  📌 Paste Week
                </Text>
              </TouchableOpacity>
            </View>
            {copiedPattern.length > 0 && (
              <Text className="mt-2 text-center text-xs text-gray-600">
                ✓ {copiedPattern.length} windows copied
              </Text>
            )}
          </View>
          {/* Weekly Availability */}
          <View className="mb-6">
            <View className="mb-3 flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-semibold text-gray-900">
                  📅 Weekly Availability
                </Text>
                <Text className="mt-1 text-xs text-gray-500">
                  Set recurring hours for each day
                </Text>
              </View>
              <View>
                <TouchableOpacity
                  onPress={() => setShowAvailabilityForm(!showAvailabilityForm)}
                  className="rounded-lg bg-green-500 px-4 py-2"
                >
                  <Text className="text-sm font-medium text-white">
                    {showAvailabilityForm ? 'Cancel' : '+ Add Hours'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {showAvailabilityForm && (
              <View className="mb-4">
                <AvailabilityForm
                  technicianId={user!.id}
                  existingAvailability={availability}
                  onSuccess={() => {
                    setShowAvailabilityForm(false);
                    loadScheduleData();
                  }}
                />
              </View>
            )}

            {/* Availability List - Improved Visual Design */}
            {availabilityByDay.map(({ day, dayIndex, windows }) => (
              <View key={dayIndex} className="mb-2">
                {windows.length > 0 && (
                  <View className="rounded-xl border-l-4 border-l-green-500 bg-white p-4 shadow-sm">
                    <Text className="mb-3 text-base font-bold text-gray-900">
                      {day}
                    </Text>
                    {windows.map((window, idx) => (
                      <View
                        key={window.id}
                        className={`flex-row items-center justify-between py-2 ${idx > 0 ? 'mt-2 border-t border-gray-100' : ''}`}
                      >
                        <View className="flex-row items-center">
                          <View className="rounded-lg bg-green-50 px-3 py-2">
                            <Text className="font-medium text-green-700">
                              {formatTime(window.start_time)} -{' '}
                              {formatTime(window.end_time)}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteAvailability(window.id)}
                          className="px-3 py-2"
                        >
                          <Text className="font-medium text-red-500">
                            Remove
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {availability.length === 0 && !showAvailabilityForm && (
              <View className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <Text className="mb-1 font-medium text-yellow-800">
                  No availability set
                </Text>
                <Text className="text-sm text-yellow-700">
                  Add your weekly availability to start receiving bookings
                </Text>
              </View>
            )}
          </View>

          {/* Time Blocks */}
          <View>
            <View className="mb-3 flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-semibold text-gray-900">
                  🚫 Scheduled Breaks
                </Text>
                <Text className="mt-1 text-xs text-gray-500">
                  Block specific dates for lunch, PTO, etc.
                </Text>
              </View>
              <View>
                <TouchableOpacity
                  onPress={() => setShowTimeBlockForm(!showTimeBlockForm)}
                  className="rounded-lg bg-red-500 px-4 py-2"
                >
                  <Text className="text-sm font-medium text-white">
                    {showTimeBlockForm ? 'Cancel' : '+ Add Break'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {showTimeBlockForm && (
              <View className="mb-4">
                <TimeBlockForm
                  technicianId={user!.id}
                  onSuccess={() => {
                    setShowTimeBlockForm(false);
                    loadScheduleData();
                  }}
                />
              </View>
            )}

            {/* Time Blocks List - Improved Visual Design */}
            {timeBlocks.length > 0 ? (
              timeBlocks.map((block) => (
                <View
                  key={block.id}
                  className="mb-2 rounded-xl border-l-4 border-l-red-500 bg-white p-4 shadow-sm"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text className="mb-2 text-base font-bold text-gray-900">
                        {formatDate(block.blocked_date)}
                      </Text>
                      <View className="self-start rounded-lg bg-red-50 px-3 py-2">
                        <Text className="font-medium text-red-700">
                          {formatTime(block.start_time)} -{' '}
                          {formatTime(block.end_time)}
                        </Text>
                      </View>
                      {block.reason && (
                        <View className="mt-2 rounded-lg bg-gray-50 px-3 py-2">
                          <Text className="text-xs text-gray-600">
                            📝 {block.reason}
                          </Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteTimeBlock(block.id)}
                      className="px-3 py-2"
                    >
                      <Text className="font-medium text-red-500">Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <Text className="text-center text-sm text-gray-600">
                  No scheduled breaks. Add breaks for lunch, appointments, or
                  time off.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
