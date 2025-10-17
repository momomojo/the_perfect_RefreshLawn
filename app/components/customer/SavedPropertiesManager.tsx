import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import {
  MapPin,
  Home,
  Plus,
  Trash2,
  Edit,
  Star,
  X,
} from "lucide-react-native";
import {
  getSavedProperties,
  createSavedProperty,
  updateSavedProperty,
  deleteSavedProperty,
  setDefaultProperty,
  SavedProperty,
} from "../../../lib/data";
import { useAuth } from "../../../lib/auth";
import { showNotification } from "../../../lib/notification";
import { useConfirmation } from "../../../lib/confirmation";

interface SavedPropertiesManagerProps {
  onSelectProperty?: (property: SavedProperty) => void;
  selectionMode?: boolean; // If true, properties are selectable for booking
}

const SavedPropertiesManager = ({
  onSelectProperty,
  selectionMode = false,
}: SavedPropertiesManagerProps) => {
  const { user } = useAuth();
  const { showConfirmation } = useConfirmation();
  const [properties, setProperties] = useState<SavedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<SavedProperty | null>(
    null
  );
  const [formData, setFormData] = useState({
    nickname: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    property_size: "",
    area_type: "",
  });

  useEffect(() => {
    if (user?.id) {
      loadProperties();
    }
  }, [user?.id]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const data = await getSavedProperties(user!.id);
      setProperties(data);
    } catch (error) {
      console.error("Error loading saved properties:", error);
      showNotification({
        title: "Error",
        message: "Failed to load saved properties",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddProperty = () => {
    setEditingProperty(null);
    setFormData({
      nickname: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      property_size: "",
      area_type: "",
    });
    setShowModal(true);
  };

  const handleEditProperty = (property: SavedProperty) => {
    setEditingProperty(property);
    setFormData({
      nickname: property.nickname,
      address: property.address,
      city: property.city || "",
      state: property.state || "",
      zip_code: property.zip_code || "",
      property_size: property.property_size || "",
      area_type: property.area_type || "",
    });
    setShowModal(true);
  };

  const handleSaveProperty = async () => {
    if (!formData.nickname.trim() || !formData.address.trim()) {
      showNotification({
        title: "Validation Error",
        message: "Property nickname and address are required",
        type: "error",
      });
      return;
    }

    try {
      if (editingProperty) {
        // Update existing property
        await updateSavedProperty(editingProperty.id, formData);
        showNotification({
          title: "Success",
          message: "Property updated successfully",
          type: "success",
        });
      } else {
        // Create new property
        await createSavedProperty({
          customer_id: user!.id,
          ...formData,
          is_default: properties.length === 0, // First property is default
        });
        showNotification({
          title: "Success",
          message: "Property saved successfully",
          type: "success",
        });
      }

      setShowModal(false);
      loadProperties();
    } catch (error: any) {
      console.error("Error saving property:", error);
      showNotification({
        title: "Error",
        message: error.message || "Failed to save property",
        type: "error",
      });
    }
  };

  const handleDeleteProperty = (property: SavedProperty) => {
    showConfirmation({
      title: "Delete Property",
      message: `Are you sure you want to delete "${property.nickname}"?`,
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          await deleteSavedProperty(property.id);
          showNotification({
            title: "Success",
            message: "Property deleted successfully",
            type: "success",
          });
          loadProperties();
        } catch (error) {
          console.error("Error deleting property:", error);
          showNotification({
            title: "Error",
            message: "Failed to delete property",
            type: "error",
          });
        }
      },
    });
  };

  const handleSetDefault = async (property: SavedProperty) => {
    if (property.is_default) return; // Already default

    try {
      await setDefaultProperty(property.id, user!.id);
      showNotification({
        title: "Success",
        message: `"${property.nickname}" set as default property`,
        type: "success",
      });
      loadProperties();
    } catch (error) {
      console.error("Error setting default property:", error);
      showNotification({
        title: "Error",
        message: "Failed to set default property",
        type: "error",
      });
    }
  };

  const handleSelectProperty = (property: SavedProperty) => {
    if (selectionMode && onSelectProperty) {
      onSelectProperty(property);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="mt-4 text-gray-600">Loading properties...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="flex-row justify-between items-center p-4 bg-white border-b border-gray-200">
        <Text className="text-xl font-bold text-gray-800">
          {selectionMode ? "Select Property" : "Saved Properties"}
        </Text>
        {!selectionMode && (
          <TouchableOpacity
            onPress={handleAddProperty}
            className="bg-green-600 px-4 py-2 rounded-lg flex-row items-center"
          >
            <Plus size={20} color="#fff" />
            <Text className="text-white font-semibold ml-1">Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1">
        {properties.length === 0 ? (
          <View className="flex-1 justify-center items-center p-8">
            <Home size={48} color="#9CA3AF" />
            <Text className="text-gray-500 text-center mt-4">
              No saved properties yet
            </Text>
            <Text className="text-gray-400 text-center mt-2">
              Save your property addresses for quick checkout
            </Text>
          </View>
        ) : (
          <View className="p-4">
            {properties.map((property) => (
              <TouchableOpacity
                key={property.id}
                className={`bg-white border rounded-lg p-4 mb-3 shadow-sm ${
                  property.is_default ? "border-green-500 border-2" : "border-gray-200"
                }`}
                onPress={() => handleSelectProperty(property)}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-row items-center flex-1">
                    <Home size={20} color={property.is_default ? "#10b981" : "#6b7280"} />
                    <Text className="text-lg font-semibold text-gray-800 ml-2">
                      {property.nickname}
                    </Text>
                    {property.is_default && (
                      <View className="ml-2 bg-green-100 px-2 py-1 rounded-full">
                        <Text className="text-xs text-green-800 font-medium">
                          Default
                        </Text>
                      </View>
                    )}
                  </View>

                  {!selectionMode && (
                    <View className="flex-row items-center">
                      {!property.is_default && (
                        <TouchableOpacity
                          onPress={() => handleSetDefault(property)}
                          className="p-2"
                        >
                          <Star size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => handleEditProperty(property)}
                        className="p-2"
                      >
                        <Edit size={18} color="#6b7280" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteProperty(property)}
                        className="p-2"
                      >
                        <Trash2 size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View className="flex-row items-start mt-2">
                  <MapPin size={16} color="#6b7280" className="mt-1" />
                  <View className="flex-1 ml-2">
                    <Text className="text-gray-600">{property.address}</Text>
                    {(property.city || property.state || property.zip_code) && (
                      <Text className="text-gray-500 text-sm">
                        {[property.city, property.state, property.zip_code]
                          .filter(Boolean)
                          .join(", ")}
                      </Text>
                    )}
                  </View>
                </View>

                {(property.property_size || property.area_type) && (
                  <View className="flex-row mt-2 space-x-2">
                    {property.property_size && (
                      <View className="bg-gray-100 px-2 py-1 rounded">
                        <Text className="text-xs text-gray-600 capitalize">
                          {property.property_size.replace("_", " ")}
                        </Text>
                      </View>
                    )}
                    {property.area_type && (
                      <View className="bg-gray-100 px-2 py-1 rounded ml-2">
                        <Text className="text-xs text-gray-600 capitalize">
                          {property.area_type.replace("_", " ")}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Property Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 max-h-5/6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-800">
                {editingProperty ? "Edit Property" : "Add Property"}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">
                  Nickname *
                </Text>
                <TextInput
                  className="bg-gray-100 px-4 py-3 rounded-lg text-gray-800"
                  placeholder="e.g., Home, Mom's House"
                  value={formData.nickname}
                  onChangeText={(text) =>
                    setFormData({ ...formData, nickname: text })
                  }
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">
                  Address *
                </Text>
                <TextInput
                  className="bg-gray-100 px-4 py-3 rounded-lg text-gray-800"
                  placeholder="Street address"
                  value={formData.address}
                  onChangeText={(text) =>
                    setFormData({ ...formData, address: text })
                  }
                  multiline
                />
              </View>

              <View className="flex-row mb-4">
                <View className="flex-1 mr-2">
                  <Text className="text-gray-700 font-medium mb-2">City</Text>
                  <TextInput
                    className="bg-gray-100 px-4 py-3 rounded-lg text-gray-800"
                    placeholder="City"
                    value={formData.city}
                    onChangeText={(text) =>
                      setFormData({ ...formData, city: text })
                    }
                  />
                </View>
                <View className="w-24">
                  <Text className="text-gray-700 font-medium mb-2">State</Text>
                  <TextInput
                    className="bg-gray-100 px-4 py-3 rounded-lg text-gray-800"
                    placeholder="ST"
                    value={formData.state}
                    onChangeText={(text) =>
                      setFormData({ ...formData, state: text.toUpperCase() })
                    }
                    maxLength={2}
                  />
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">ZIP Code</Text>
                <TextInput
                  className="bg-gray-100 px-4 py-3 rounded-lg text-gray-800"
                  placeholder="ZIP"
                  value={formData.zip_code}
                  onChangeText={(text) =>
                    setFormData({ ...formData, zip_code: text })
                  }
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">
                  Property Size
                </Text>
                <View className="flex-row flex-wrap">
                  {["small", "medium", "large", "extra_large"].map((size) => (
                    <TouchableOpacity
                      key={size}
                      onPress={() =>
                        setFormData({ ...formData, property_size: size })
                      }
                      className={`px-4 py-2 rounded-lg mr-2 mb-2 ${
                        formData.property_size === size
                          ? "bg-green-600"
                          : "bg-gray-200"
                      }`}
                    >
                      <Text
                        className={`${
                          formData.property_size === size
                            ? "text-white"
                            : "text-gray-700"
                        } capitalize`}
                      >
                        {size.replace("_", " ")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">
                  Area Type
                </Text>
                <View className="flex-row flex-wrap">
                  {["front_yard", "back_yard", "both"].map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() =>
                        setFormData({ ...formData, area_type: type })
                      }
                      className={`px-4 py-2 rounded-lg mr-2 mb-2 ${
                        formData.area_type === type
                          ? "bg-green-600"
                          : "bg-gray-200"
                      }`}
                    >
                      <Text
                        className={`${
                          formData.area_type === type
                            ? "text-white"
                            : "text-gray-700"
                        } capitalize`}
                      >
                        {type.replace("_", " ")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSaveProperty}
                className="bg-green-600 py-4 rounded-lg"
              >
                <Text className="text-white text-center font-bold text-lg">
                  {editingProperty ? "Update Property" : "Save Property"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SavedPropertiesManager;
