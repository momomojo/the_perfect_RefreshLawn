import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Calendar } from "lucide-react-native";
import { getTechnicianBookings } from "../../../lib/data";
import { useAuth } from "../../../lib/auth";
import { format, addDays, startOfWeek } from "date-fns";

interface DaySchedule {
  date: string;
  dayName: string;
  jobCount: number;
}

interface WeeklyScheduleProps {
  onDayPress?: (date: string) => void;
}

const WeeklySchedule = ({ onDayPress = () => {} }: WeeklyScheduleProps) => {
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user?.id) return;

    const loadWeeklySchedule = async () => {
      try {
        setLoading(true);

        // Get all technician bookings from Supabase
        const bookings = await getTechnicianBookings(user.id);

        // Generate the week view (starting from current week's Monday)
        const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Start week on Monday
        const weekSchedule: DaySchedule[] = [];

        // Create an array for the 7 days of the week
        for (let i = 0; i < 7; i++) {
          const currentDate = addDays(currentWeekStart, i);
          const formattedDate = currentDate.toISOString().split("T")[0];

          // Count jobs for this date
          const jobsCount = bookings.filter(
            (booking) => booking.scheduled_date === formattedDate
          ).length;

          weekSchedule.push({
            date: formattedDate,
            dayName: format(currentDate, "EEE"),
            jobCount: jobsCount,
          });
        }

        setSchedule(weekSchedule);
      } catch (err) {
        console.error("Error loading weekly schedule:", err);
      } finally {
        setLoading(false);
      }
    };

    loadWeeklySchedule();
  }, [user?.id]);

  if (loading) {
    return (
      <View className="bg-white rounded-lg p-4 shadow-sm mb-4 justify-center items-center">
        <ActivityIndicator size="small" color="#22c55e" />
        <Text className="text-gray-500 mt-2">Loading schedule...</Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-lg p-4 shadow-sm mb-4">
      <View className="flex-row items-center mb-3">
        <Calendar size={20} color="#22c55e" />
        <Text className="text-lg font-semibold ml-2">Weekly Schedule</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row space-x-3 py-2">
          {schedule.map((day) => (
            <TouchableOpacity
              key={day.date}
              onPress={() => onDayPress(day.date)}
              className={`items-center justify-center w-16 h-20 rounded-lg p-2 ${
                day.date === today
                  ? "bg-green-100 border border-green-500"
                  : "bg-gray-50"
              }`}
            >
              <Text className="text-sm font-medium">{day.dayName}</Text>
              <Text
                className={`text-xl font-bold ${
                  day.jobCount > 0 ? "text-green-600" : "text-gray-400"
                }`}
              >
                {day.jobCount}
              </Text>
              <Text className="text-xs text-gray-500">
                {day.jobCount === 1 ? "job" : "jobs"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default WeeklySchedule;
