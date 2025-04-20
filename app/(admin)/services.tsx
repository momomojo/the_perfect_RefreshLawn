import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { Stack } from "expo-router";
import ServiceManagement from "../components/admin/ServiceManagement";
import { supabase } from "../../lib/supabase";
import {
  getServices,
  createService,
  updateService,
  deleteService,
  Service,
} from "../../lib/data";
import { Check, X, Plus, Camera, Upload } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { showNotification } from "../../lib/notification";
import { useConfirmation } from "../../lib/confirmation";

export default function ServicesScreen() {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    base_price: "",
    duration_minutes: "",
    image_url: "",
    is_active: true,
  });
  const { showConfirmation } = useConfirmation();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getServices();
      setServices(data);
    } catch (err: any) {
      console.error("Error fetching services:", err);
      setError(err.message || "Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions first
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        showNotification({
          title: "Permission Required",
          message: "We need permission to access your photo library.",
          type: "warning",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) {
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        showNotification({
          title: "Error",
          message: "No image was selected",
          type: "error",
        });
        return;
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        showNotification({
          title: "Error",
          message: "Failed to process image",
          type: "error",
        });
        return;
      }

      await uploadImage(asset.base64);
    } catch (error) {
      console.error("Error picking image:", error);
      showNotification({
        title: "Error",
        message: "Failed to pick image",
        type: "error",
      });
    }
  };

  const uploadImage = async (base64Image: string) => {
    try {
      setImageUploadLoading(true);

      // Create a unique file name
      const fileExt = "jpg"; // Fixed extension for simplicity
      const fileName = `service-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Direct upload approach
      const { data, error } = await supabase.storage
        .from("service_images") // This bucket must exist in Supabase
        .upload(filePath, decode(base64Image), {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (error) {
        if (error.message.includes("Bucket not found")) {
          showNotification({
            title: "Storage Setup Required",
            message: "The storage bucket for images doesn't exist. Please create a bucket named 'service_images' in your Supabase dashboard and ensure it has the right permissions.",
            type: "warning",
          });
        } else {
          throw error;
        }
        return;
      }

      // Get the public URL
      const { data: publicURLData } = supabase.storage
        .from("service_images")
        .getPublicUrl(filePath);

      if (publicURLData) {
        setNewService({ ...newService, image_url: publicURLData.publicUrl });
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      showNotification({
        title: "Error",
        message: "Failed to upload image. Check console for details.",
        type: "error",
      });
    } finally {
      setImageUploadLoading(false);
    }
  };

  const handleAddService = async () => {
    console.log("Add service action triggered");

    if (!newService.name || !newService.base_price) {
      showNotification({
        title: "Error",
        message: "Service name and price are required",
        type: "error",
      });
      return;
    }

    try {
      // Convert price to number
      const price = parseFloat(newService.base_price);
      if (isNaN(price)) {
        showNotification({
          title: "Error",
          message: "Price must be a valid number",
          type: "error",
        });
        return;
      }

      // Convert duration to number
      const duration = newService.duration_minutes
        ? parseInt(newService.duration_minutes)
        : 60; // Default duration

      if (isNaN(duration)) {
        showNotification({
          title: "Error",
          message: "Duration must be a valid number",
          type: "error",
        });
        return;
      }

      // Use the createService function from data.ts
      const serviceData = {
        name: newService.name,
        description: newService.description || undefined,
        base_price: price,
        duration_minutes: duration,
        image_url: newService.image_url || undefined,
        is_active: newService.is_active,
      };

      await createService(serviceData);

      showNotification({
        title: "Success",
        message: `Service "${newService.name}" has been added successfully!`,
        type: "success",
      });
      setShowAddForm(false);
      setNewService({
        name: "",
        description: "",
        base_price: "",
        duration_minutes: "",
        image_url: "",
        is_active: true,
      });
      fetchServices();
    } catch (error: any) {
      console.error("Error adding service:", error);
      showNotification({
        title: "Error",
        message: error.message || "Failed to add service",
        type: "error",
      });
    }
  };

  const handleUpdateService = async (
    service: Service,
    updates: Partial<Service>
  ) => {
    try {
      // Use the updateService function from data.ts
      await updateService(service.id, updates);

      showNotification({
        title: "Success",
        message: `Service "${service.name}" has been updated successfully!`,
        type: "success",
      });
      fetchServices();
    } catch (error: any) {
      console.error("Error updating service:", error);
      showNotification({
        title: "Error",
        message: error.message || "Failed to update service",
        type: "error",
      });
    }
  };

  const handleDeleteService = async (
    serviceId: string,
    serviceName: string
  ) => {
    showConfirmation({
      title: "Confirm Delete",
      message: `Are you sure you want to delete "${serviceName}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      confirmButtonStyle: "destructive",
      onConfirm: async () => {
        try {
          // Check if service is used in any bookings
          const { data: bookings, error: bookingsError } = await supabase
            .from("bookings")
            .select("id")
            .eq("service_id", serviceId)
            .limit(1);

          if (bookingsError) throw bookingsError;

          if (bookings && bookings.length > 0) {
            // Service is in use, ask if they want to deactivate instead
            showConfirmation({
              title: "Service In Use",
              message: "This service is currently used in bookings. Instead of deleting, would you like to deactivate it?",
              confirmText: "Deactivate",
              cancelText: "Cancel",
              confirmButtonStyle: "destructive",
              onConfirm: () =>
                handleUpdateService({ id: serviceId } as Service, {
                  is_active: false,
                }),
            });
            return;
          }

          // If no bookings found, proceed with deletion using function from data.ts
          await deleteService(serviceId);

          showNotification({
            title: "Success",
            message: `Service "${serviceName}" has been deleted successfully!`,
            type: "success",
          });
          fetchServices();
        } catch (error: any) {
          console.error("Error deleting service:", error);
          showNotification({
            title: "Error",
            message: error.message || "Failed to delete service",
            type: "error",
          });
        }
      },
    });
  };

  const toggleServiceStatus = async (service: Service) => {
    try {
      const newStatus = !service.is_active;

      // Use the updateService function from data.ts
      await updateService(service.id, { is_active: newStatus });

      showNotification({
        title: "Success",
        message: `Service "${service.name}" has been ${
          newStatus ? "activated" : "deactivated"
        }!`,
        type: "success",
      });
      fetchServices();
    } catch (error: any) {
      console.error("Error toggling service status:", error);
      showNotification({
        title: "Error",
        message: error.message || "Failed to update service status",
        type: "error",
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#22c55e" />
          <Text className="mt-4 text-gray-600">Loading services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-red-500 text-lg mb-4">
            Error loading services
          </Text>
          <Text className="text-gray-600 text-center mb-6">{error}</Text>
          <TouchableOpacity
            className="bg-green-600 px-4 py-2 rounded-md"
            onPress={fetchServices}
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* Header */}
        <View className="px-4 py-6 bg-green-700">
          <Text className="text-2xl font-bold text-white">
            Service Management
          </Text>
          <Text className="text-white opacity-80 mt-1">
            Manage your lawn service offerings
          </Text>
        </View>

        {/* Add Service Button */}
        <View className="px-4 py-3 bg-white border-b border-gray-200">
          <TouchableOpacity
            className="flex-row items-center justify-center bg-green-600 px-4 py-2 rounded-md"
            onPress={() => setShowAddForm(true)}
          >
            <Plus size={18} color="#fff" />
            <Text className="ml-2 text-white font-medium">Add New Service</Text>
          </TouchableOpacity>
        </View>

        {/* Add Service Form */}
        {showAddForm && (
          <View className="p-4 bg-white border-b border-gray-200">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold">Add New Service</Text>
              <TouchableOpacity
                onPress={() => setShowAddForm(false)}
                className="p-2"
              >
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Image Upload Section */}
            <View className="mb-4 items-center">
              <TouchableOpacity
                onPress={pickImage}
                disabled={imageUploadLoading}
                className="bg-gray-100 rounded-lg w-32 h-32 items-center justify-center border border-gray-300 mb-2"
              >
                {newService.image_url ? (
                  <Image
                    source={{ uri: newService.image_url }}
                    className="w-full h-full rounded-lg"
                    resizeMode="cover"
                  />
                ) : (
                  <>
                    <Camera size={32} color="#9ca3af" />
                    <Text className="text-gray-500 text-sm mt-2">
                      {imageUploadLoading ? "Uploading..." : "Add Image"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              {newService.image_url && (
                <TouchableOpacity
                  onPress={() =>
                    setNewService({ ...newService, image_url: "" })
                  }
                  className="bg-red-100 px-3 py-1 rounded-full flex-row items-center"
                >
                  <X size={14} color="#ef4444" />
                  <Text className="text-red-600 text-xs ml-1">Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-1">Service Name*</Text>
              <TextInput
                className="border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g., Lawn Mowing"
                value={newService.name}
                onChangeText={(text) =>
                  setNewService({ ...newService, name: text })
                }
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-1">Description</Text>
              <TextInput
                className="border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g., Professional lawn mowing service"
                value={newService.description}
                onChangeText={(text) =>
                  setNewService({ ...newService, description: text })
                }
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View className="flex-row mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-gray-700 mb-1">Price ($)*</Text>
                <TextInput
                  className="border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., 49.99"
                  value={newService.base_price}
                  onChangeText={(text) =>
                    setNewService({ ...newService, base_price: text })
                  }
                  keyboardType="decimal-pad"
                />
              </View>

              <View className="flex-1 ml-2">
                <Text className="text-gray-700 mb-1">Duration (minutes)</Text>
                <TextInput
                  className="border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., 60"
                  value={newService.duration_minutes}
                  onChangeText={(text) =>
                    setNewService({ ...newService, duration_minutes: text })
                  }
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View className="flex-row items-center mb-4">
              <TouchableOpacity
                className="flex-row items-center"
                onPress={() =>
                  setNewService({
                    ...newService,
                    is_active: !newService.is_active,
                  })
                }
              >
                <View
                  className={`w-5 h-5 rounded mr-2 border ${
                    newService.is_active
                      ? "bg-green-500 border-green-600"
                      : "border-gray-400"
                  } items-center justify-center`}
                >
                  {newService.is_active && <Check size={14} color="#fff" />}
                </View>
                <Text>Active Service</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-end mt-2">
              <TouchableOpacity
                className="bg-gray-200 px-4 py-2 rounded-md mr-2"
                onPress={() => setShowAddForm(false)}
              >
                <Text className="text-gray-800">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-green-600 px-4 py-2 rounded-md"
                onPress={handleAddService}
              >
                <Text className="text-white">Add Service</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Service List */}
        <View className="flex-1">
          <ServiceManagement
            services={services}
            onUpdateService={handleUpdateService}
            onDeleteService={handleDeleteService}
            onToggleStatus={toggleServiceStatus}
          />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
