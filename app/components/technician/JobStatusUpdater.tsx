import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { Camera, CheckCircle, Clock, Upload, X } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

interface JobStatusUpdaterProps {
  jobId?: string;
  currentStatus?: "scheduled" | "in-progress" | "completed" | "cancelled";
  onStatusUpdate?: (status: string, data?: any) => void;
}

const JobStatusUpdater = ({
  jobId = "12345",
  currentStatus = "scheduled",
  onStatusUpdate = () => {},
}: JobStatusUpdaterProps) => {
  const [status, setStatus] = useState(currentStatus);
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const handleStatusChange = (
    newStatus: "scheduled" | "in-progress" | "completed" | "cancelled",
  ) => {
    setStatus(newStatus);
    onStatusUpdate(newStatus);
  };

  const pickImage = async (type: "before" | "after") => {
    // Mock image picker functionality
    const mockImage = `https://images.unsplash.com/photo-1558904541-efa843a96f01?w=400&q=80`;

    if (type === "before") {
      setBeforePhotos([...beforePhotos, mockImage]);
    } else {
      setAfterPhotos([...afterPhotos, mockImage]);
    }
  };

  const removePhoto = (index: number, type: "before" | "after") => {
    if (type === "before") {
      setBeforePhotos(beforePhotos.filter((_, i) => i !== index));
    } else {
      setAfterPhotos(afterPhotos.filter((_, i) => i !== index));
    }
  };

  const submitJobReport = () => {
    // Submit job report with status, photos, and notes
    onStatusUpdate("completed", { beforePhotos, afterPhotos, notes });
    // Reset form or navigate away
  };

  return (
    <View className="bg-white p-4 rounded-lg shadow-md w-full">
      <Text className="text-xl font-bold mb-4">Update Job Status</Text>

      {/* Status Buttons */}
      <View className="flex-row justify-between mb-6">
        <TouchableOpacity
          className={`px-3 py-2 rounded-full flex-row items-center ${status === "scheduled" ? "bg-blue-100" : "bg-gray-100"}`}
          onPress={() => handleStatusChange("scheduled")}
        >
          <Clock
            size={16}
            color={status === "scheduled" ? "#3b82f6" : "#6b7280"}
          />
          <Text
            className={`ml-1 ${status === "scheduled" ? "text-blue-600" : "text-gray-600"}`}
          >
            Scheduled
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`px-3 py-2 rounded-full flex-row items-center ${status === "in-progress" ? "bg-yellow-100" : "bg-gray-100"}`}
          onPress={() => handleStatusChange("in-progress")}
        >
          <Clock
            size={16}
            color={status === "in-progress" ? "#f59e0b" : "#6b7280"}
          />
          <Text
            className={`ml-1 ${status === "in-progress" ? "text-yellow-600" : "text-gray-600"}`}
          >
            In Progress
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`px-3 py-2 rounded-full flex-row items-center ${status === "completed" ? "bg-green-100" : "bg-gray-100"}`}
          onPress={() => handleStatusChange("completed")}
        >
          <CheckCircle
            size={16}
            color={status === "completed" ? "#10b981" : "#6b7280"}
          />
          <Text
            className={`ml-1 ${status === "completed" ? "text-green-600" : "text-gray-600"}`}
          >
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Photo Upload Section */}
      <View className="mb-6">
        <Text className="font-semibold mb-2">Before Photos</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-2"
        >
          <View className="flex-row">
            {beforePhotos.map((photo, index) => (
              <View key={`before-${index}`} className="mr-2 relative">
                <Image
                  source={{ uri: photo }}
                  className="w-20 h-20 rounded-md"
                />
                <TouchableOpacity
                  className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1"
                  onPress={() => removePhoto(index, "before")}
                >
                  <X size={12} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              className="w-20 h-20 bg-gray-100 rounded-md items-center justify-center"
              onPress={() => pickImage("before")}
            >
              <Camera size={24} color="#6b7280" />
              <Text className="text-xs text-gray-500 mt-1">Add Photo</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {status === "in-progress" || status === "completed" ? (
          <>
            <Text className="font-semibold mb-2">After Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row">
                {afterPhotos.map((photo, index) => (
                  <View key={`after-${index}`} className="mr-2 relative">
                    <Image
                      source={{ uri: photo }}
                      className="w-20 h-20 rounded-md"
                    />
                    <TouchableOpacity
                      className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1"
                      onPress={() => removePhoto(index, "after")}
                    >
                      <X size={12} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  className="w-20 h-20 bg-gray-100 rounded-md items-center justify-center"
                  onPress={() => pickImage("after")}
                >
                  <Camera size={24} color="#6b7280" />
                  <Text className="text-xs text-gray-500 mt-1">Add Photo</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </>
        ) : null}
      </View>

      {/* Submit Button */}
      {status === "completed" && (
        <TouchableOpacity
          className="bg-green-500 py-3 rounded-lg items-center"
          onPress={submitJobReport}
        >
          <Text className="text-white font-semibold">Submit Job Report</Text>
        </TouchableOpacity>
      )}

      {status === "in-progress" && (
        <TouchableOpacity
          className="bg-blue-500 py-3 rounded-lg items-center"
          onPress={() => handleStatusChange("completed")}
        >
          <Text className="text-white font-semibold">Mark as Completed</Text>
        </TouchableOpacity>
      )}

      {status === "scheduled" && (
        <TouchableOpacity
          className="bg-yellow-500 py-3 rounded-lg items-center"
          onPress={() => handleStatusChange("in-progress")}
        >
          <Text className="text-white font-semibold">Start Job</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default JobStatusUpdater;
