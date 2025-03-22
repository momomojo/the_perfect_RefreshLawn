import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import {
  Camera,
  CheckCircle,
  Clock,
  Upload,
  X,
  AlertCircle,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

interface JobStatusUpdaterProps {
  jobId: string;
  currentStatus:
    | "pending"
    | "scheduled"
    | "in_progress"
    | "completed"
    | "cancelled";
  onStatusUpdate: (status: string, data?: any) => void;
}

const JobStatusUpdater = ({
  jobId,
  currentStatus,
  onStatusUpdate,
}: JobStatusUpdaterProps) => {
  const [status, setStatus] = useState(currentStatus);
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleStatusChange = (
    newStatus:
      | "pending"
      | "scheduled"
      | "in_progress"
      | "completed"
      | "cancelled"
  ) => {
    setStatus(newStatus);
    onStatusUpdate(newStatus);
  };

  const pickImage = async (type: "before" | "after") => {
    try {
      // Ask for permission
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "We need access to your photos to upload them"
        );
        return;
      }

      // Launch image library
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0].uri;

        if (type === "before") {
          setBeforePhotos([...beforePhotos, selectedImage]);
        } else {
          setAfterPhotos([...afterPhotos, selectedImage]);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "There was a problem selecting the image");
    }
  };

  const removePhoto = (index: number, type: "before" | "after") => {
    if (type === "before") {
      setBeforePhotos(beforePhotos.filter((_, i) => i !== index));
    } else {
      setAfterPhotos(afterPhotos.filter((_, i) => i !== index));
    }
  };

  const submitJobReport = async () => {
    try {
      setUploading(true);
      // In a real implementation, you would upload all photos to storage
      // and store their URLs in the database with the booking.

      // For now, just update status
      onStatusUpdate("completed", { beforePhotos, afterPhotos, notes });

      // Reset photos to avoid duplicate submissions
      setBeforePhotos([]);
      setAfterPhotos([]);
      setNotes("");
    } catch (error) {
      console.error("Error submitting job report:", error);
      Alert.alert("Error", "There was a problem submitting the job report");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View className="bg-white p-4 rounded-lg shadow-md w-full">
      <Text className="text-xl font-bold mb-4">Update Job Status</Text>

      {/* Status Buttons */}
      <View className="flex-row justify-between mb-6 flex-wrap">
        <TouchableOpacity
          className={`px-3 py-2 rounded-full flex-row items-center ${
            status === "scheduled" ? "bg-blue-100" : "bg-gray-100"
          } mb-2`}
          onPress={() => handleStatusChange("scheduled")}
        >
          <Clock
            size={16}
            color={status === "scheduled" ? "#3b82f6" : "#6b7280"}
          />
          <Text
            className={`ml-1 ${
              status === "scheduled" ? "text-blue-600" : "text-gray-600"
            }`}
          >
            Scheduled
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`px-3 py-2 rounded-full flex-row items-center ${
            status === "in_progress" ? "bg-yellow-100" : "bg-gray-100"
          } mb-2`}
          onPress={() => handleStatusChange("in_progress")}
        >
          <Clock
            size={16}
            color={status === "in_progress" ? "#f59e0b" : "#6b7280"}
          />
          <Text
            className={`ml-1 ${
              status === "in_progress" ? "text-yellow-600" : "text-gray-600"
            }`}
          >
            In Progress
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`px-3 py-2 rounded-full flex-row items-center ${
            status === "completed" ? "bg-green-100" : "bg-gray-100"
          } mb-2`}
          onPress={() => handleStatusChange("completed")}
        >
          <CheckCircle
            size={16}
            color={status === "completed" ? "#10b981" : "#6b7280"}
          />
          <Text
            className={`ml-1 ${
              status === "completed" ? "text-green-600" : "text-gray-600"
            }`}
          >
            Completed
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`px-3 py-2 rounded-full flex-row items-center ${
            status === "cancelled" ? "bg-red-100" : "bg-gray-100"
          } mb-2`}
          onPress={() => handleStatusChange("cancelled")}
        >
          <AlertCircle
            size={16}
            color={status === "cancelled" ? "#ef4444" : "#6b7280"}
          />
          <Text
            className={`ml-1 ${
              status === "cancelled" ? "text-red-600" : "text-gray-600"
            }`}
          >
            Cancelled
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

        {status === "in_progress" || status === "completed" ? (
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
          className={`bg-green-500 py-3 rounded-lg items-center ${
            uploading ? "opacity-70" : ""
          }`}
          onPress={submitJobReport}
          disabled={uploading}
        >
          <Text className="text-white font-semibold">
            {uploading ? "Submitting..." : "Submit Job Report"}
          </Text>
        </TouchableOpacity>
      )}

      {status === "in_progress" && (
        <TouchableOpacity
          className="bg-blue-500 py-3 rounded-lg items-center"
          onPress={() => handleStatusChange("completed")}
          disabled={uploading}
        >
          <Text className="text-white font-semibold">Mark as Completed</Text>
        </TouchableOpacity>
      )}

      {status === "scheduled" && (
        <TouchableOpacity
          className="bg-yellow-500 py-3 rounded-lg items-center"
          onPress={() => handleStatusChange("in_progress")}
          disabled={uploading}
        >
          <Text className="text-white font-semibold">Start Job</Text>
        </TouchableOpacity>
      )}

      {status === "cancelled" && (
        <View className="bg-red-100 p-3 rounded-lg">
          <Text className="text-red-600 text-center">
            This job has been cancelled.
          </Text>
        </View>
      )}
    </View>
  );
};

export default JobStatusUpdater;
