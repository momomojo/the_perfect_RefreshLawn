import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Image,
} from "react-native";
import {
  Edit,
  Trash2,
  DollarSign,
  Clock,
  X,
  ToggleLeft,
  ToggleRight,
  Info,
  Image as ImageIcon,
  Camera,
} from "lucide-react-native";
import { Service } from "../../lib/data";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../../lib/supabase";
import { decode } from "base64-arraybuffer";

interface ServiceManagementProps {
  services: Service[];
  onUpdateService: (service: Service, updates: Partial<Service>) => void;
  onDeleteService: (serviceId: string, serviceName: string) => void;
  onToggleStatus: (service: Service) => void;
}

const ServiceManagement = ({
  services,
  onUpdateService,
  onDeleteService,
  onToggleStatus,
}: ServiceManagementProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    description: "",
    base_price: "",
    duration_minutes: "",
    image_url: "",
  });

  // Filter services based on search query
  const filteredServices = services.filter((service) => {
    const serviceName = service.name.toLowerCase();
    const serviceDesc = (service.description || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return serviceName.includes(query) || serviceDesc.includes(query);
  });

  // Handle edit service button click
  const handleEditClick = (service: Service) => {
    setEditingService(service);
    setEditFormData({
      name: service.name,
      description: service.description || "",
      base_price: service.base_price.toString(),
      duration_minutes: service.duration_minutes?.toString() || "60",
      image_url: service.image_url || "",
    });
  };

  const pickImage = async () => {
    if (!editingService) return;

    try {
      // Request permissions first
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "We need permission to access your photo library."
        );
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
        Alert.alert("Error", "No image was selected");
        return;
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert("Error", "Failed to process image");
        return;
      }

      await uploadImage(asset.base64);
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadImage = async (base64Image: string) => {
    try {
      setImageUploadLoading(true);

      // Create a unique file name
      const fileExt = "jpg"; // Fixed extension for simplicity
      const fileName = `service-${editingService?.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Using the more direct approach to upload
      const { data, error } = await supabase.storage
        .from("service_images") // Make sure this bucket exists in Supabase
        .upload(filePath, decode(base64Image), {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (error) {
        if (error.message.includes("Bucket not found")) {
          // Bucket doesn't exist - we should inform the user
          Alert.alert(
            "Storage Setup Required",
            "The storage bucket for images doesn't exist. Please create a bucket named 'service_images' in your Supabase dashboard."
          );
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
        setEditFormData({
          ...editFormData,
          image_url: publicURLData.publicUrl,
        });
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert(
        "Error",
        "Failed to upload image. Check console for details."
      );
    } finally {
      setImageUploadLoading(false);
    }
  };

  // Handle save edit
  const handleSaveEdit = () => {
    if (!editingService) return;

    if (!editFormData.name) {
      Alert.alert("Error", "Service name is required");
      return;
    }

    // Convert price to number
    const price = parseFloat(editFormData.base_price);
    if (isNaN(price)) {
      Alert.alert("Error", "Price must be a valid number");
      return;
    }

    // Convert duration to number
    const duration = editFormData.duration_minutes
      ? parseInt(editFormData.duration_minutes)
      : 60; // Default duration

    if (isNaN(duration)) {
      Alert.alert("Error", "Duration must be a valid number");
      return;
    }

    // Prepare updates
    const updates: Partial<Service> = {
      name: editFormData.name,
      description: editFormData.description || null,
      base_price: price,
      duration_minutes: duration,
      image_url: editFormData.image_url || null,
    };

    onUpdateService(editingService, updates);
    setEditingService(null);
  };

  // Render "No services" message when the list is empty
  if (services.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-gray-500 text-center">
          No services found. Add your first service to get started.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white p-4">
      {/* Search Bar */}
      <View className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 px-3 py-2 flex-row items-center">
        <Info size={18} color="#6b7280" />
        <TextInput
          className="flex-1 ml-2 text-gray-800"
          placeholder="Search services by name or description"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <X size={18} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Services List */}
      {filteredServices.length === 0 ? (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-gray-500 text-center">
            No services found. Try a different search term or add a new service.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1">
          {filteredServices.map((service) => (
            <View
              key={service.id}
              className={`bg-white rounded-lg shadow-sm border ${
                service.is_active
                  ? "border-gray-200"
                  : "border-gray-300 bg-gray-50"
              } mb-3 overflow-hidden`}
            >
              {/* Service Header */}
              <View className="p-4 border-b border-gray-100">
                <View className="flex-row justify-between items-center">
                  <View className="flex-row flex-1">
                    {service.image_url ? (
                      <Image
                        source={{ uri: service.image_url }}
                        className="w-16 h-16 rounded-md mr-3"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-16 h-16 rounded-md mr-3 bg-gray-100 items-center justify-center">
                        <ImageIcon size={24} color="#9ca3af" />
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="text-lg font-semibold">
                        {service.name}
                      </Text>
                      {service.description && (
                        <Text className="text-gray-600 mt-1" numberOfLines={2}>
                          {service.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View className="flex-row">
                    <TouchableOpacity
                      className="p-2 bg-blue-50 rounded-full mr-2"
                      onPress={() => handleEditClick(service)}
                    >
                      <Edit size={18} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="p-2 bg-red-50 rounded-full"
                      onPress={() => onDeleteService(service.id, service.name)}
                    >
                      <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Service Details */}
              <View className="p-4">
                <View className="flex-row mb-2">
                  <View className="flex-row items-center flex-1">
                    <DollarSign size={16} color="#22c55e" />
                    <Text className="text-gray-700 ml-1">
                      Price:{" "}
                      <Text className="font-medium">
                        ${service.base_price.toFixed(2)}
                      </Text>
                    </Text>
                  </View>
                  <View className="flex-row items-center flex-1">
                    <Clock size={16} color="#6366f1" />
                    <Text className="text-gray-700 ml-1">
                      Duration:{" "}
                      <Text className="font-medium">
                        {service.duration_minutes || 60} min
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* Status Toggle */}
                <TouchableOpacity
                  className={`flex-row items-center mt-2 py-2 px-3 rounded-md ${
                    service.is_active ? "bg-green-100" : "bg-gray-100"
                  }`}
                  onPress={() => onToggleStatus(service)}
                >
                  {service.is_active ? (
                    <>
                      <ToggleRight size={20} color="#15803d" />
                      <Text className="ml-2 text-green-800 font-medium">
                        Active
                      </Text>
                    </>
                  ) : (
                    <>
                      <ToggleLeft size={20} color="#6b7280" />
                      <Text className="ml-2 text-gray-600 font-medium">
                        Inactive
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Edit Modal */}
      <Modal
        visible={!!editingService}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingService(null)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white w-[90%] rounded-lg p-4 shadow-xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold">Edit Service</Text>
              <TouchableOpacity
                onPress={() => setEditingService(null)}
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
                {editFormData.image_url ? (
                  <Image
                    source={{ uri: editFormData.image_url }}
                    className="w-full h-full rounded-lg"
                    resizeMode="cover"
                  />
                ) : (
                  <>
                    <Camera size={32} color="#9ca3af" />
                    <Text className="text-gray-500 text-sm mt-2">
                      {imageUploadLoading ? "Uploading..." : "Service Image"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              {editFormData.image_url && (
                <TouchableOpacity
                  onPress={() =>
                    setEditFormData({ ...editFormData, image_url: "" })
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
                value={editFormData.name}
                onChangeText={(text) =>
                  setEditFormData({ ...editFormData, name: text })
                }
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-1">Description</Text>
              <TextInput
                className="border border-gray-300 rounded-md px-3 py-2"
                value={editFormData.description}
                onChangeText={(text) =>
                  setEditFormData({ ...editFormData, description: text })
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
                  value={editFormData.base_price}
                  onChangeText={(text) =>
                    setEditFormData({ ...editFormData, base_price: text })
                  }
                  keyboardType="decimal-pad"
                />
              </View>

              <View className="flex-1 ml-2">
                <Text className="text-gray-700 mb-1">Duration (minutes)</Text>
                <TextInput
                  className="border border-gray-300 rounded-md px-3 py-2"
                  value={editFormData.duration_minutes}
                  onChangeText={(text) =>
                    setEditFormData({ ...editFormData, duration_minutes: text })
                  }
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View className="flex-row justify-end mt-2">
              <TouchableOpacity
                className="bg-gray-200 px-4 py-2 rounded-md mr-2"
                onPress={() => setEditingService(null)}
              >
                <Text className="text-gray-800">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-green-600 px-4 py-2 rounded-md"
                onPress={handleSaveEdit}
              >
                <Text className="text-white">Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ServiceManagement;
