import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
  Platform,
} from "react-native";
import {
  Camera,
  CheckCircle,
  Clock,
  Upload,
  X,
  AlertCircle,
} from "lucide-react-native";
import { useAuth } from "../../../lib/auth";
import * as ImagePicker from "expo-image-picker";
import { showNotification } from "@/lib/notification";
import { supabase } from "../../../lib/supabase";
import * as ImageManipulator from "expo-image-manipulator";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer"; // Use this instead of Buffer

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
  const { user } = useAuth(); // Get authenticated user
  const [status, setStatus] = useState(currentStatus);
  const [beforePhotos, setBeforePhotos] = useState<any[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchPhotos = async () => {
    console.log("[fetchPhotos] Fetching photos for jobId:", jobId);
    if (!jobId) {
      console.error("[fetchPhotos] Error: jobId is missing!");
      return;
    }

    const { data, error } = await supabase
      .from("booking_images")
      .select("id, storage_path, type, uploaded_at")
      .eq("booking_id", jobId)
      .order("uploaded_at", { ascending: true });

    if (error) {
      console.error("[fetchPhotos] Error fetching booking images:", error);
      // Handle potential 400 error from logs here
      if (error.code === "PGRST100" || error.message.includes("400")) {
        console.error(
          "[fetchPhotos] Received 400 error, check RLS policies or query parameters for booking_images table."
        );
      }
      setBeforePhotos([]);
      setAfterPhotos([]);
      return;
    }

    if (!data) {
      console.log("[fetchPhotos] No images found for jobId:", jobId);
      setBeforePhotos([]);
      setAfterPhotos([]);
      return;
    }

    console.log("[fetchPhotos] Fetched image data:", data);

    const before = [];
    const after = [];

    for (const img of data) {
      // Use createSignedUrl for private buckets
      const { data: signedUrlData, error: signedUrlError } =
        await supabase.storage
          .from("booking-images") // Using exact bucket name with hyphen
          .createSignedUrl(img.storage_path, 3600); // 3600 seconds = 1 hour expiration

      // Handle potential error during URL generation
      if (signedUrlError) {
        console.error(
          "[fetchPhotos] Error creating signed URL for:",
          img.storage_path,
          signedUrlError
        );
        continue; // Skip this image
      }

      // Check if we received the signed URL data
      if (signedUrlData && signedUrlData.signedUrl) {
        // Success case: we have the signed URL
        console.log(
          "[fetchPhotos] Public URL for",
          img.storage_path,
          ":",
          signedUrlData.signedUrl // Log the signed URL
        );

        const photoData = {
          id: img.id,
          uri: signedUrlData.signedUrl, // Use the signed URL for the Image component
          storage_path: img.storage_path,
        };

        if (img.type === "before") {
          before.push(photoData);
        } else if (img.type === "after") {
          after.push(photoData);
        }
      } else {
        // Failure case: data is null OR publicUrl is missing
        console.warn(
          "[fetchPhotos] Could not get signed URL for path (data null or signedUrl missing):",
          img.storage_path
        );
        continue; // Skip this image
      }
    }

    setBeforePhotos(before);
    setAfterPhotos(after);
    console.log("[fetchPhotos] Processed Before photos:", before.length);
    console.log("[fetchPhotos] Processed After photos:", after.length);
  };

  useEffect(() => {
    console.log(
      "[useEffect] JobStatusUpdater mounted/jobId changed. Current jobId:",
      jobId
    );
    console.log(
      "Current authenticated user:",
      user ? `ID: ${user.id}, Email: ${user.email}` : "Not logged in"
    );

    // A simpler Supabase client check that just logs the URL
    console.log(
      "Supabase URL configured:",
      !!process.env.EXPO_PUBLIC_SUPABASE_URL ? "✓ YES" : "✗ NO"
    );
    console.log(
      "Supabase key configured:",
      !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? "✓ YES" : "✗ NO"
    );

    // Using the simpler approach to check storage access as done in ServiceManagement
    console.log("Testing storage access...");
    supabase.storage
      .from("booking-images")
      .list()
      .then(({ data, error }) => {
        if (error) {
          console.error("Storage access error:", error.message);
        } else {
          console.log(
            `Storage access success! Found ${
              data?.length || 0
            } objects in booking-images bucket`
          );
        }
      })
      .catch((e) => {
        console.error("Storage test error:", e);
      });

    if (jobId) {
      fetchPhotos();
    }
  }, [jobId]);

  const handleStatusChange = (
    newStatus:
      | "pending"
      | "scheduled"
      | "in_progress"
      | "completed"
      | "cancelled"
  ) => {
    setStatus(newStatus);
    // For all status changes except completed, update immediately
    if (newStatus !== "completed") {
      onStatusUpdate(newStatus);
    }
  };

  const pickImage = async (type: "before" | "after") => {
    console.log(`Entering pickImage for type: ${type}`);
    try {
      console.log(`Picking image for ${type} photos`);
      setUploading(true);

      // Request permissions
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Denied",
            "Sorry, we need camera roll permissions to upload photos."
          );
          setUploading(false);
          return;
        }
      }

      // Pick the image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true, // Request base64 like in ServiceManagement
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log("Image picker result:", result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log("Selected asset:", asset);

        // Generate a unique filename (use .jpg extension)
        const fileName = `${uuidv4()}.jpg`;
        console.log("Generated file name:", fileName);

        if (!user) {
          console.error("No authenticated user found");
          Alert.alert("Error", "You must be logged in to upload photos");
          setUploading(false);
          return;
        }

        try {
          let arrayBuffer;
          let contentType = "image/jpeg"; // Default content type
          let uploadPayload: ArrayBuffer | string | Blob; // Variable to hold the correct payload (Blob for web, ArrayBuffer for native)

          if (Platform.OS === "web") {
            // For web, we need to get the blob first, then convert to ArrayBuffer
            console.log(`Web platform: Processing URI: ${asset.uri}`);
            const response = await fetch(asset.uri);
            if (!response.ok) {
              throw new Error(
                `Failed to fetch image. Status: ${response.status}`
              );
            }
            console.log(
              "Fetch response status:",
              response.status,
              "ok:",
              response.ok
            );
            const blob = await response.blob();
            console.log(
              `Blob fetched successfully: size=${blob.size}, type=${blob.type}`
            );
            // Assign the Blob directly to the payload for web uploads
            uploadPayload = blob;
            contentType = blob.type || contentType; // Use blob's type if available
            console.log(
              `Using Blob for web upload: size=${blob.size}, type=${contentType}`
            );
          } else {
            // For native platforms, get base64
            let base64Data = "";
            if (asset.base64) {
              base64Data = asset.base64;
            } else {
              base64Data = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
            }
            if (!base64Data) {
              throw new Error("Failed to get base64 data for native platform.");
            }
            console.log(`Got base64 data, length: ${base64Data.length}`);
            // Assign decoded base64 (ArrayBuffer) for native uploads
            uploadPayload = decode(base64Data);
            console.log(
              `Using decoded base64 (ArrayBuffer) for native upload: length=${uploadPayload.byteLength}`
            );
          }

          // Define bucket and path
          const bucketName = "booking-images"; // Ensure this matches your Supabase bucket
          const storagePath = `${jobId}/${fileName}`; // Use jobId in the path

          // Check if we have an authenticated session before upload
          const { data: sessionData, error: sessionError } =
            await supabase.auth.getSession();
          console.log(
            "Current session before upload:",
            JSON.stringify(sessionData, null, 2)
          );
          if (sessionError) {
            console.error("Error getting session:", sessionError);
            Alert.alert(
              "Authentication Error",
              "Could not verify user session."
            );
            setUploading(false);
            return; // Stop if session check fails
          }
          if (!sessionData?.session?.user) {
            console.error(
              "No authenticated user found in session before upload!"
            );
            Alert.alert(
              "Authentication Error",
              "Cannot upload image without a logged-in user."
            );
            setUploading(false);
            return; // Stop if no user
          }

          // Upload using the determined payload
          let uploadData: any, uploadError: any;
          try {
            console.log(
              `Attempting Supabase upload to bucket: ${bucketName} at path: ${storagePath}`
            );
            const options = {
              contentType: contentType || "image/jpeg",
              cacheControl: "3600",
              upsert: true,
            };
            // Use the correct uploadPayload based on platform
            const { data: uploadDataResp, error: uploadErrorResp } =
              await supabase.storage
                .from(bucketName)
                .upload(storagePath, uploadPayload, options);
            uploadData = uploadDataResp;
            uploadError = uploadErrorResp;
            console.log(
              "Supabase upload attempt finished. Data:",
              uploadData,
              "Error:",
              uploadError
            );
          } catch (e: any) {
            console.error("CRITICAL ERROR during supabase.storage.upload:", e);
            uploadError = e; // Assign the caught error
          }

          // Check for explicit error OR missing data/path
          if (uploadError || !uploadData?.path) {
            const errorMessage = uploadError
              ? uploadError.message
              : "Upload completed but no path returned.";
            console.error(
              "Error uploading image to Supabase:",
              errorMessage,
              uploadError || "No error object, but data missing"
            );
            Alert.alert(
              "Upload Error",
              `Failed to upload image: ${errorMessage}`
            );
            setUploading(false);
            return; // Stop execution if upload failed
          }

          console.log(
            "Image uploaded successfully to Supabase Storage:",
            uploadData.path
          );

          // After successful storage.upload
          if (!uploadError && uploadData?.path) {
            // Persist record in booking_images table
            const { data: dbData, error: dbError } = await supabase
              .from("booking_images")
              .insert({
                booking_id: jobId,
                storage_path: uploadData.path,
                type: type,
                uploaded_by: user?.id,
                uploaded_at: new Date().toISOString(),
              });
            if (dbError) {
              console.error(
                `[pickImage] Error inserting booking_images record:`,
                dbError
              );
            } else {
              console.log(
                `[pickImage] booking_images record inserted:`,
                dbData
              );
            }
            // Refresh photos to include the newly added one
            await fetchPhotos();
          }

          // Add entry to booking_images table
          const { data: dbData, error: dbError } = await supabase
            .from("booking_images")
            .insert([
              {
                booking_id: jobId,
                storage_path: uploadData.path,
                type: type,
                uploaded_by: user?.id,
              },
            ]);

          if (dbError) {
            console.error("Error saving to database:", dbError.message);
            Alert.alert(
              "Database Error",
              "Image uploaded but failed to record in database."
            );
          } else {
            console.log("Image record saved to database");
            // Refresh the images list
            fetchPhotos();
            Alert.alert("Success", "Photo uploaded successfully!");
          }
        } catch (uploadError: any) {
          console.error("Error in file processing/upload:", uploadError);
          Alert.alert(
            "Upload Error",
            `Failed to process or upload the image: ${
              uploadError?.message || "Unknown error"
            }`
          );
        }
      } else {
        console.log("Image picker cancelled or no image selected");
      }
    } catch (error) {
      console.error("Error in pickImage:", error);
      Alert.alert("Error", "An error occurred while uploading the image.");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (index: number, type: "before" | "after") => {
    const arr = type === "before" ? beforePhotos : afterPhotos;
    const photo = arr[index];
    console.log(
      `[removePhoto] Attempting to remove ${type} photo at index ${index}:`,
      photo
    );
    if (!photo || !photo.storage_path || !photo.id) {
      console.error("[removePhoto] Invalid photo data for removal.");
      Alert.alert("Error", "Cannot remove photo: invalid data.");
      return;
    }
    setUploading(true);
    console.log("[removePhoto] Removing from storage:", photo.storage_path);
    const { error: storageError } = await supabase.storage
      .from("booking-images") // Using exact bucket name with hyphen
      .remove([photo.storage_path]);
    console.log("[removePhoto] Removing from database, id:", photo.id);
    const { error: dbError } = await supabase
      .from("booking_images")
      .delete()
      .eq("id", photo.id);
    console.log("[removePhoto] Re-fetching photos after removal.");
    await fetchPhotos();
    setUploading(false);
    if (storageError) {
      console.error("[removePhoto] Storage removal error:", storageError);
      Alert.alert("Delete failed (Storage)", storageError.message);
    }
    if (dbError) {
      console.error("[removePhoto] Database removal error:", dbError);
      Alert.alert("Delete failed (Database)", dbError.message);
    }
    if (!storageError && !dbError) {
      console.log("[removePhoto] Removal successful.");
    }
  };

  const submitJobReport = async () => {
    try {
      setUploading(true);
      onStatusUpdate("completed", { beforePhotos, afterPhotos, notes });
      setBeforePhotos([]);
      setAfterPhotos([]);
      setNotes("");
    } catch (error) {
      console.error("Error submitting job report:", error);
      showNotification({
        title: "Error",
        message: "There was a problem submitting the job report",
        type: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <View className="bg-white p-4 rounded-lg shadow-md w-full">
      <Text className="text-xl font-bold mb-4">Update Job Status</Text>

      {/* Notes Input Section */}
      <View className="mb-6">
        <Text className="font-semibold mb-2">Job Report Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Enter detailed report notes"
          multiline
          className="bg-gray-100 p-2 rounded h-24 text-gray-700"
        />
      </View>

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
                  source={{ uri: photo.uri }}
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
                      source={{ uri: photo.uri }}
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
