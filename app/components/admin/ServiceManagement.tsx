import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Image,
} from "react-native";
import {
  PlusCircle,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Clock,
  Calendar,
} from "lucide-react-native";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  image: string;
  isActive: boolean;
  category: string;
}

interface ServiceManagementProps {
  services?: Service[];
  onAddService?: (service: Omit<Service, "id">) => void;
  onUpdateService?: (service: Service) => void;
  onDeleteService?: (id: string) => void;
}

const ServiceManagement = ({
  services = [
    {
      id: "1",
      name: "Basic Lawn Mowing",
      description:
        "Standard lawn mowing service for residential properties up to 1/4 acre.",
      price: 45,
      duration: 60,
      image:
        "https://images.unsplash.com/photo-1589428473816-1158d3155c67?w=600&q=80",
      isActive: true,
      category: "Mowing",
    },
    {
      id: "2",
      name: "Premium Lawn Care",
      description:
        "Complete lawn care package including mowing, edging, and blowing.",
      price: 75,
      duration: 90,
      image:
        "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=600&q=80",
      isActive: true,
      category: "Maintenance",
    },
    {
      id: "3",
      name: "Seasonal Cleanup",
      description:
        "Thorough cleanup of leaves, debris, and lawn preparation for the season.",
      price: 120,
      duration: 120,
      image:
        "https://images.unsplash.com/photo-1593710876534-dce3202894fb?w=600&q=80",
      isActive: false,
      category: "Cleanup",
    },
  ],
  onAddService = () => {},
  onUpdateService = () => {},
  onDeleteService = () => {},
}: ServiceManagementProps) => {
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(
    null,
  );
  const [isAddingService, setIsAddingService] = useState(false);
  const [newService, setNewService] = useState<Omit<Service, "id">>({
    name: "",
    description: "",
    price: 0,
    duration: 30,
    image:
      "https://images.unsplash.com/photo-1589428473816-1158d3155c67?w=600&q=80",
    isActive: true,
    category: "Mowing",
  });
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("All");

  const categories = [
    "All",
    ...Array.from(new Set(services.map((service) => service.category))),
  ];

  const filteredServices =
    filterCategory === "All"
      ? services
      : services.filter((service) => service.category === filterCategory);

  const toggleServiceExpansion = (id: string) => {
    setExpandedServiceId(expandedServiceId === id ? null : id);
  };

  const handleAddService = () => {
    onAddService(newService);
    setIsAddingService(false);
    setNewService({
      name: "",
      description: "",
      price: 0,
      duration: 30,
      image:
        "https://images.unsplash.com/photo-1589428473816-1158d3155c67?w=600&q=80",
      isActive: true,
      category: "Mowing",
    });
  };

  const handleUpdateService = () => {
    if (editingService) {
      onUpdateService(editingService);
      setEditingService(null);
    }
  };

  const handleDeleteService = (id: string) => {
    onDeleteService(id);
  };

  return (
    <View className="flex-1 bg-white">
      <View className="p-4 bg-green-700">
        <Text className="text-xl font-bold text-white">Service Management</Text>
        <Text className="text-white">
          Add, edit, and manage lawn care services
        </Text>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="py-2 px-4 bg-green-50"
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            onPress={() => setFilterCategory(category)}
            className={`px-4 py-2 mr-2 rounded-full ${filterCategory === category ? "bg-green-600" : "bg-green-100"}`}
          >
            <Text
              className={`${filterCategory === category ? "text-white" : "text-green-800"}`}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView className="flex-1 p-4">
        {/* Add Service Button */}
        {!isAddingService && !editingService && (
          <TouchableOpacity
            onPress={() => setIsAddingService(true)}
            className="flex-row items-center justify-center p-3 mb-4 bg-green-600 rounded-lg"
          >
            <PlusCircle size={20} color="white" />
            <Text className="ml-2 text-white font-semibold">
              Add New Service
            </Text>
          </TouchableOpacity>
        )}

        {/* Add Service Form */}
        {isAddingService && (
          <View className="p-4 mb-4 bg-white rounded-lg shadow-md border border-gray-200">
            <Text className="text-lg font-bold mb-4">Add New Service</Text>

            <View className="mb-4">
              <Text className="mb-1 text-gray-700">Service Name</Text>
              <TextInput
                value={newService.name}
                onChangeText={(text) =>
                  setNewService({ ...newService, name: text })
                }
                className="p-2 border border-gray-300 rounded-md"
                placeholder="Enter service name"
              />
            </View>

            <View className="mb-4">
              <Text className="mb-1 text-gray-700">Category</Text>
              <TextInput
                value={newService.category}
                onChangeText={(text) =>
                  setNewService({ ...newService, category: text })
                }
                className="p-2 border border-gray-300 rounded-md"
                placeholder="Enter category"
              />
            </View>

            <View className="mb-4">
              <Text className="mb-1 text-gray-700">Description</Text>
              <TextInput
                value={newService.description}
                onChangeText={(text) =>
                  setNewService({ ...newService, description: text })
                }
                className="p-2 border border-gray-300 rounded-md"
                placeholder="Enter description"
                multiline
                numberOfLines={3}
              />
            </View>

            <View className="mb-4">
              <Text className="mb-1 text-gray-700">Price ($)</Text>
              <TextInput
                value={newService.price.toString()}
                onChangeText={(text) =>
                  setNewService({ ...newService, price: parseFloat(text) || 0 })
                }
                className="p-2 border border-gray-300 rounded-md"
                placeholder="Enter price"
                keyboardType="numeric"
              />
            </View>

            <View className="mb-4">
              <Text className="mb-1 text-gray-700">Duration (minutes)</Text>
              <TextInput
                value={newService.duration.toString()}
                onChangeText={(text) =>
                  setNewService({
                    ...newService,
                    duration: parseInt(text) || 0,
                  })
                }
                className="p-2 border border-gray-300 rounded-md"
                placeholder="Enter duration"
                keyboardType="numeric"
              />
            </View>

            <View className="mb-4">
              <Text className="mb-1 text-gray-700">Image URL</Text>
              <TextInput
                value={newService.image}
                onChangeText={(text) =>
                  setNewService({ ...newService, image: text })
                }
                className="p-2 border border-gray-300 rounded-md"
                placeholder="Enter image URL"
              />
            </View>

            <View className="flex-row items-center mb-4">
              <Text className="mr-2 text-gray-700">Active</Text>
              <Switch
                value={newService.isActive}
                onValueChange={(value) =>
                  setNewService({ ...newService, isActive: value })
                }
                trackColor={{ false: "#d1d5db", true: "#10b981" }}
              />
            </View>

            <View className="flex-row justify-end">
              <TouchableOpacity
                onPress={() => setIsAddingService(false)}
                className="px-4 py-2 mr-2 bg-gray-200 rounded-md"
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddService}
                className="px-4 py-2 bg-green-600 rounded-md"
              >
                <Text className="text-white">Add Service</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Edit Service Form */}
        {editingService && (
          <View className="p-4 mb-4 bg-white rounded-lg shadow-md border border-gray-200">
            <Text className="text-lg font-bold mb-4">Edit Service</Text>

            <View className="mb-4">
              <Text className="mb-1 text-gray-700">Service Name</Text>
              <TextInput
                value={editingService.name}
                onChangeText={(text) =>
                  setEditingService({ ...editingService, name: text })
                }
                className="p-2 border border-gray-300 rounded-md"
                placeholder="Enter service name"
              />
            </View>

            <View className="mb-4">
              <Text className="mb-1 text-gray-700">Category</Text>
              <TextInput
                value={editingService.category}
                onChangeText={(text) =>
                  setEditingService({ ...editingService, category: text })
                }
                className="p-2 border border-gray-300 rounded-md"
                placeholder="Enter category"
              />
            </View>

            <View className="mb-4">
              <Text className="mb-1 text-gray-700">Description</Text>
              <TextInput
                value={editingService.description}
                onChangeText={(text) =>
                  setEditingService({ ...editingService, description: text })
                }
                className="p-2 border border-gray-300 rounded-md"
                placeholder="Enter description"
                multiline
                numberOfLines={3}
              />
            </View>

            <View className="mb-4">
              <Text className="mb-1 text-gray-700">Price ($)</Text>
              <TextInput
                value={editingService.price.toString()}
                onChangeText={(text) =>
                  setEditingService({
                    ...editingService,
                    price: parseFloat(text) || 0,
                  })
                }
                className="p-2 border border-gray-300 rounded-md"
                placeholder="Enter price"
                keyboardType="numeric"
              />
            </View>

            <View className="mb-4">
              <Text className="mb-1 text-gray-700">Duration (minutes)</Text>
              <TextInput
                value={editingService.duration.toString()}
                onChangeText={(text) =>
                  setEditingService({
                    ...editingService,
                    duration: parseInt(text) || 0,
                  })
                }
                className="p-2 border border-gray-300 rounded-md"
                placeholder="Enter duration"
                keyboardType="numeric"
              />
            </View>

            <View className="mb-4">
              <Text className="mb-1 text-gray-700">Image URL</Text>
              <TextInput
                value={editingService.image}
                onChangeText={(text) =>
                  setEditingService({ ...editingService, image: text })
                }
                className="p-2 border border-gray-300 rounded-md"
                placeholder="Enter image URL"
              />
            </View>

            <View className="flex-row items-center mb-4">
              <Text className="mr-2 text-gray-700">Active</Text>
              <Switch
                value={editingService.isActive}
                onValueChange={(value) =>
                  setEditingService({ ...editingService, isActive: value })
                }
                trackColor={{ false: "#d1d5db", true: "#10b981" }}
              />
            </View>

            <View className="flex-row justify-end">
              <TouchableOpacity
                onPress={() => setEditingService(null)}
                className="px-4 py-2 mr-2 bg-gray-200 rounded-md"
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdateService}
                className="px-4 py-2 bg-green-600 rounded-md"
              >
                <Text className="text-white">Update Service</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Services List */}
        {filteredServices.map((service) => (
          <View
            key={service.id}
            className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <TouchableOpacity
              onPress={() => toggleServiceExpansion(service.id)}
              className="flex-row items-center p-4"
            >
              <Image
                source={{ uri: service.image }}
                className="w-16 h-16 rounded-md mr-3"
              />
              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-lg font-semibold">{service.name}</Text>
                  <View
                    className={`px-2 py-1 rounded-full ${service.isActive ? "bg-green-100" : "bg-gray-100"}`}
                  >
                    <Text
                      className={`text-xs ${service.isActive ? "text-green-800" : "text-gray-800"}`}
                    >
                      {service.isActive ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>
                <Text className="text-gray-600">{service.category}</Text>
                <View className="flex-row items-center mt-1">
                  <DollarSign size={14} color="#4b5563" />
                  <Text className="text-gray-600 ml-1 mr-3">
                    ${service.price}
                  </Text>
                  <Clock size={14} color="#4b5563" />
                  <Text className="text-gray-600 ml-1">
                    {service.duration} min
                  </Text>
                </View>
              </View>
              {expandedServiceId === service.id ? (
                <ChevronUp size={20} color="#4b5563" />
              ) : (
                <ChevronDown size={20} color="#4b5563" />
              )}
            </TouchableOpacity>

            {expandedServiceId === service.id && (
              <View className="p-4 pt-0 border-t border-gray-200">
                <Text className="mb-3">{service.description}</Text>
                <View className="flex-row justify-end">
                  <TouchableOpacity
                    onPress={() => setEditingService(service)}
                    className="flex-row items-center p-2 mr-2 bg-blue-100 rounded-md"
                  >
                    <Edit size={16} color="#1d4ed8" />
                    <Text className="ml-1 text-blue-800">Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteService(service.id)}
                    className="flex-row items-center p-2 bg-red-100 rounded-md"
                  >
                    <Trash2 size={16} color="#b91c1c" />
                    <Text className="ml-1 text-red-800">Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default ServiceManagement;
