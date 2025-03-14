import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
} from "react-native";
import {
  ChevronDown,
  Camera,
  Calendar,
  Clock,
  Bell,
  Save,
} from "lucide-react-native";

interface TechnicianProfileProps {
  name?: string;
  email?: string;
  phone?: string;
  skills?: string[];
  availability?: {
    day: string;
    available: boolean;
    startTime: string;
    endTime: string;
  }[];
  notificationPreferences?: {
    newJobs: boolean;
    scheduleChanges: boolean;
    urgentRequests: boolean;
    appUpdates: boolean;
  };
}

const TechnicianProfile = ({
  name = "John Smith",
  email = "john.smith@example.com",
  phone = "(555) 123-4567",
  skills = ["Lawn Mowing", "Hedge Trimming", "Fertilization", "Weed Control"],
  availability = [
    { day: "Monday", available: true, startTime: "08:00", endTime: "17:00" },
    { day: "Tuesday", available: true, startTime: "08:00", endTime: "17:00" },
    { day: "Wednesday", available: true, startTime: "08:00", endTime: "17:00" },
    { day: "Thursday", available: true, startTime: "08:00", endTime: "17:00" },
    { day: "Friday", available: true, startTime: "08:00", endTime: "17:00" },
    { day: "Saturday", available: false, startTime: "09:00", endTime: "15:00" },
    { day: "Sunday", available: false, startTime: "09:00", endTime: "15:00" },
  ],
  notificationPreferences = {
    newJobs: true,
    scheduleChanges: true,
    urgentRequests: true,
    appUpdates: false,
  },
}: TechnicianProfileProps) => {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [editedName, setEditedName] = useState(name);
  const [editedEmail, setEditedEmail] = useState(email);
  const [editedPhone, setEditedPhone] = useState(phone);
  const [editedSkills, setEditedSkills] = useState(skills);
  const [editedAvailability, setEditedAvailability] = useState(availability);
  const [editedNotifications, setEditedNotifications] = useState(
    notificationPreferences,
  );
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);

  const allSkillOptions = [
    "Lawn Mowing",
    "Hedge Trimming",
    "Fertilization",
    "Weed Control",
    "Leaf Removal",
    "Aeration",
    "Seeding",
    "Irrigation",
    "Pest Control",
    "Snow Removal",
  ];

  const toggleSkill = (skill: string) => {
    if (editedSkills.includes(skill)) {
      setEditedSkills(editedSkills.filter((s) => s !== skill));
    } else {
      setEditedSkills([...editedSkills, skill]);
    }
  };

  const toggleAvailability = (day: string) => {
    setEditedAvailability(
      editedAvailability.map((item) =>
        item.day === day ? { ...item, available: !item.available } : item,
      ),
    );
  };

  const updateAvailabilityTime = (
    day: string,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    setEditedAvailability(
      editedAvailability.map((item) =>
        item.day === day ? { ...item, [field]: value } : item,
      ),
    );
  };

  const toggleNotification = (key: keyof typeof notificationPreferences) => {
    setEditedNotifications({
      ...editedNotifications,
      [key]: !editedNotifications[key],
    });
  };

  const handleSave = () => {
    // In a real app, this would save the profile data to the backend
    console.log("Profile saved", {
      name: editedName,
      email: editedEmail,
      phone: editedPhone,
      skills: editedSkills,
      availability: editedAvailability,
      notificationPreferences: editedNotifications,
    });
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        {/* Profile Header */}
        <View className="items-center mb-6">
          <TouchableOpacity
            className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center mb-2"
            onPress={() => console.log("Change profile picture")}
          >
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                className="w-24 h-24 rounded-full"
              />
            ) : (
              <Camera size={40} color="#9ca3af" />
            )}
          </TouchableOpacity>
          <Text className="text-lg font-bold">{editedName}</Text>
          <Text className="text-sm text-gray-500">Lawn Care Technician</Text>
        </View>

        {/* Personal Information */}
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-3">
            Personal Information
          </Text>
          <View className="bg-gray-50 rounded-lg p-4">
            <View className="mb-4">
              <Text className="text-sm text-gray-500 mb-1">Full Name</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-md p-2"
                value={editedName}
                onChangeText={setEditedName}
              />
            </View>
            <View className="mb-4">
              <Text className="text-sm text-gray-500 mb-1">Email</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-md p-2"
                value={editedEmail}
                onChangeText={setEditedEmail}
                keyboardType="email-address"
              />
            </View>
            <View>
              <Text className="text-sm text-gray-500 mb-1">Phone</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-md p-2"
                value={editedPhone}
                onChangeText={setEditedPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* Skills */}
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-3">Skills & Expertise</Text>
          <View className="bg-gray-50 rounded-lg p-4">
            <TouchableOpacity
              className="flex-row justify-between items-center bg-white border border-gray-200 rounded-md p-3 mb-2"
              onPress={() => setShowSkillsDropdown(!showSkillsDropdown)}
            >
              <Text>
                {editedSkills.length > 0
                  ? `${editedSkills.length} skills selected`
                  : "Select your skills"}
              </Text>
              <ChevronDown size={20} color="#6b7280" />
            </TouchableOpacity>

            {showSkillsDropdown && (
              <View className="bg-white border border-gray-200 rounded-md p-2 mb-4">
                {allSkillOptions.map((skill) => (
                  <TouchableOpacity
                    key={skill}
                    className="flex-row items-center py-2"
                    onPress={() => toggleSkill(skill)}
                  >
                    <View
                      className={`w-5 h-5 rounded mr-2 ${editedSkills.includes(skill) ? "bg-green-500" : "border border-gray-300"}`}
                    />
                    <Text>{skill}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View className="flex-row flex-wrap">
              {editedSkills.map((skill) => (
                <View
                  key={skill}
                  className="bg-green-100 rounded-full px-3 py-1 m-1"
                >
                  <Text className="text-green-800 text-sm">{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Availability */}
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-3">Availability</Text>
          <View className="bg-gray-50 rounded-lg p-4">
            {editedAvailability.map((day) => (
              <View key={day.day} className="mb-3 last:mb-0">
                <View className="flex-row justify-between items-center mb-2">
                  <View className="flex-row items-center">
                    <Calendar size={16} color="#6b7280" className="mr-2" />
                    <Text className="font-medium">{day.day}</Text>
                  </View>
                  <Switch
                    value={day.available}
                    onValueChange={() => toggleAvailability(day.day)}
                    trackColor={{ false: "#d1d5db", true: "#10b981" }}
                  />
                </View>

                {day.available && (
                  <View className="flex-row justify-between bg-white rounded-md p-2 border border-gray-200">
                    <View className="flex-row items-center">
                      <Clock size={16} color="#6b7280" className="mr-1" />
                      <Text className="text-sm mr-2">From:</Text>
                      <TextInput
                        className="border border-gray-200 rounded px-2 py-1 w-16"
                        value={day.startTime}
                        onChangeText={(value) =>
                          updateAvailabilityTime(day.day, "startTime", value)
                        }
                      />
                    </View>
                    <View className="flex-row items-center">
                      <Text className="text-sm mr-2">To:</Text>
                      <TextInput
                        className="border border-gray-200 rounded px-2 py-1 w-16"
                        value={day.endTime}
                        onChangeText={(value) =>
                          updateAvailabilityTime(day.day, "endTime", value)
                        }
                      />
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Notification Preferences */}
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-3">
            Notification Preferences
          </Text>
          <View className="bg-gray-50 rounded-lg p-4">
            <View className="flex-row justify-between items-center py-3 border-b border-gray-200">
              <View className="flex-row items-center">
                <Bell size={16} color="#6b7280" className="mr-2" />
                <Text>New Job Assignments</Text>
              </View>
              <Switch
                value={editedNotifications.newJobs}
                onValueChange={() => toggleNotification("newJobs")}
                trackColor={{ false: "#d1d5db", true: "#10b981" }}
              />
            </View>
            <View className="flex-row justify-between items-center py-3 border-b border-gray-200">
              <View className="flex-row items-center">
                <Bell size={16} color="#6b7280" className="mr-2" />
                <Text>Schedule Changes</Text>
              </View>
              <Switch
                value={editedNotifications.scheduleChanges}
                onValueChange={() => toggleNotification("scheduleChanges")}
                trackColor={{ false: "#d1d5db", true: "#10b981" }}
              />
            </View>
            <View className="flex-row justify-between items-center py-3 border-b border-gray-200">
              <View className="flex-row items-center">
                <Bell size={16} color="#6b7280" className="mr-2" />
                <Text>Urgent Requests</Text>
              </View>
              <Switch
                value={editedNotifications.urgentRequests}
                onValueChange={() => toggleNotification("urgentRequests")}
                trackColor={{ false: "#d1d5db", true: "#10b981" }}
              />
            </View>
            <View className="flex-row justify-between items-center py-3">
              <View className="flex-row items-center">
                <Bell size={16} color="#6b7280" className="mr-2" />
                <Text>App Updates</Text>
              </View>
              <Switch
                value={editedNotifications.appUpdates}
                onValueChange={() => toggleNotification("appUpdates")}
                trackColor={{ false: "#d1d5db", true: "#10b981" }}
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          className="bg-green-500 rounded-lg py-3 items-center mb-8"
          onPress={handleSave}
        >
          <View className="flex-row items-center">
            <Save size={20} color="white" className="mr-2" />
            <Text className="text-white font-semibold text-lg">
              Save Changes
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default TechnicianProfile;
