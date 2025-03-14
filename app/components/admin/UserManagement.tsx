import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Switch,
} from "react-native";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Filter,
  ChevronDown,
  UserCog,
  UserCheck,
  UserX,
} from "lucide-react-native";

type UserRole = "customer" | "technician" | "admin";

type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "inactive";
  dateJoined: string;
  avatar?: string;
};

interface UserManagementProps {
  users?: User[];
  onAddUser?: () => void;
  onEditUser?: (user: User) => void;
  onDeleteUser?: (userId: string) => void;
  onToggleUserStatus?: (
    userId: string,
    newStatus: "active" | "inactive",
  ) => void;
}

const UserManagement = ({
  users = [
    {
      id: "1",
      name: "John Smith",
      email: "john.smith@example.com",
      role: "customer",
      status: "active",
      dateJoined: "2023-05-15",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
    },
    {
      id: "2",
      name: "Sarah Johnson",
      email: "sarah.j@example.com",
      role: "technician",
      status: "active",
      dateJoined: "2023-06-22",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
    },
    {
      id: "3",
      name: "Michael Davis",
      email: "michael.d@example.com",
      role: "admin",
      status: "active",
      dateJoined: "2023-04-10",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael",
    },
    {
      id: "4",
      name: "Emily Wilson",
      email: "emily.w@example.com",
      role: "customer",
      status: "inactive",
      dateJoined: "2023-07-05",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emily",
    },
    {
      id: "5",
      name: "Robert Brown",
      email: "robert.b@example.com",
      role: "technician",
      status: "inactive",
      dateJoined: "2023-08-18",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=robert",
    },
  ],
  onAddUser = () => console.log("Add user"),
  onEditUser = (user) => console.log("Edit user", user),
  onDeleteUser = (userId) => console.log("Delete user", userId),
  onToggleUserStatus = (userId, newStatus) =>
    console.log("Toggle status", userId, newStatus),
}: UserManagementProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "admin":
        return <UserCog size={18} color="#4f46e5" />;
      case "technician":
        return <UserCheck size={18} color="#0891b2" />;
      case "customer":
        return <UserX size={18} color="#059669" />;
      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-white p-4">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-2xl font-bold text-gray-800">
          User Management
        </Text>
        <TouchableOpacity
          className="bg-green-600 px-4 py-2 rounded-lg flex-row items-center"
          onPress={onAddUser}
        >
          <Plus size={18} color="white" />
          <Text className="text-white font-medium ml-1">Add User</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View className="flex-row mb-6 items-center">
        <View className="flex-1 flex-row bg-gray-100 rounded-lg px-3 py-2 items-center mr-2">
          <Search size={20} color="#6b7280" />
          <TextInput
            className="flex-1 ml-2 text-gray-800"
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View className="relative">
          <TouchableOpacity
            className="bg-gray-100 rounded-lg px-3 py-2 flex-row items-center"
            onPress={() => setShowFilterMenu(!showFilterMenu)}
          >
            <Filter size={20} color="#6b7280" />
            <Text className="ml-2 text-gray-700">Filter</Text>
            <ChevronDown size={16} color="#6b7280" className="ml-1" />
          </TouchableOpacity>

          {showFilterMenu && (
            <View className="absolute top-11 right-0 bg-white rounded-lg shadow-lg z-10 w-40 border border-gray-200">
              <TouchableOpacity
                className="px-4 py-2 border-b border-gray-100"
                onPress={() => {
                  setSelectedRole("all");
                  setShowFilterMenu(false);
                }}
              >
                <Text
                  className={`${selectedRole === "all" ? "text-blue-600 font-medium" : "text-gray-700"}`}
                >
                  All Users
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-4 py-2 border-b border-gray-100"
                onPress={() => {
                  setSelectedRole("customer");
                  setShowFilterMenu(false);
                }}
              >
                <Text
                  className={`${selectedRole === "customer" ? "text-blue-600 font-medium" : "text-gray-700"}`}
                >
                  Customers
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-4 py-2 border-b border-gray-100"
                onPress={() => {
                  setSelectedRole("technician");
                  setShowFilterMenu(false);
                }}
              >
                <Text
                  className={`${selectedRole === "technician" ? "text-blue-600 font-medium" : "text-gray-700"}`}
                >
                  Technicians
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-4 py-2"
                onPress={() => {
                  setSelectedRole("admin");
                  setShowFilterMenu(false);
                }}
              >
                <Text
                  className={`${selectedRole === "admin" ? "text-blue-600 font-medium" : "text-gray-700"}`}
                >
                  Admins
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* User List */}
      <ScrollView className="flex-1">
        {filteredUsers.length === 0 ? (
          <View className="items-center justify-center py-10">
            <Text className="text-gray-500 text-lg">No users found</Text>
          </View>
        ) : (
          filteredUsers.map((user) => (
            <View
              key={user.id}
              className="bg-gray-50 rounded-lg p-4 mb-3 flex-row items-center"
            >
              <Image
                source={{
                  uri:
                    user.avatar ||
                    "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
                }}
                className="w-12 h-12 rounded-full bg-gray-200"
              />
              <View className="flex-1 ml-3">
                <Text className="font-medium text-gray-800">{user.name}</Text>
                <Text className="text-gray-500 text-sm">{user.email}</Text>
                <View className="flex-row items-center mt-1">
                  {getRoleIcon(user.role)}
                  <Text className="text-xs text-gray-600 ml-1 capitalize">
                    {user.role}
                  </Text>
                  <Text className="text-xs text-gray-400 ml-3">
                    Joined: {user.dateJoined}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <View className="flex-row items-center mr-4">
                  <Text className="text-sm text-gray-600 mr-2">
                    {user.status === "active" ? "Active" : "Inactive"}
                  </Text>
                  <Switch
                    value={user.status === "active"}
                    onValueChange={() =>
                      onToggleUserStatus(
                        user.id,
                        user.status === "active" ? "inactive" : "active",
                      )
                    }
                    trackColor={{ false: "#d1d5db", true: "#10b981" }}
                  />
                </View>
                <TouchableOpacity
                  className="p-2 mr-1"
                  onPress={() => onEditUser(user)}
                >
                  <Edit2 size={18} color="#6b7280" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="p-2"
                  onPress={() => onDeleteUser(user.id)}
                >
                  <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default UserManagement;
