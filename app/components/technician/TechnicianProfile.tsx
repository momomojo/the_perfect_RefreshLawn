import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import {
  ChevronDown,
  Camera,
  Bell,
  Save,
  LogOut,
  ChevronRight,
  Mail,
} from 'lucide-react-native';
import { useAuth } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';
import { updateProfile } from '../../../lib/data';
import { showNotification } from '../../../lib/notification'; // Import the utility

interface TechnicianProfileProps {
  name?: string;
  email?: string;
  phone?: string;
  skills?: string[];
  autoSendJobReports?: boolean;
  notificationPreferences?: {
    newJobs: boolean;
    scheduleChanges: boolean;
    urgentRequests: boolean;
    appUpdates: boolean;
  };
}

const TechnicianProfile = ({
  name = 'John Smith',
  email = 'john.smith@example.com',
  phone = '(555) 123-4567',
  skills = ['Lawn Mowing', 'Hedge Trimming', 'Fertilization', 'Weed Control'],
  autoSendJobReports = true,
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
  const [editedAutoSendReports, setEditedAutoSendReports] =
    useState(autoSendJobReports);
  const [editedNotifications, setEditedNotifications] = useState(
    notificationPreferences
  );
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);
  const [loadingState, setLoading] = useState(false);
  const { signOut } = useAuth();

  const allSkillOptions = [
    'Lawn Mowing',
    'Hedge Trimming',
    'Fertilization',
    'Weed Control',
    'Leaf Removal',
    'Aeration',
    'Seeding',
    'Irrigation',
    'Pest Control',
    'Snow Removal',
  ];

  const toggleSkill = (skill: string) => {
    if (editedSkills.includes(skill)) {
      setEditedSkills(editedSkills.filter((s) => s !== skill));
    } else {
      setEditedSkills([...editedSkills, skill]);
    }
  };

  const toggleNotification = (key: keyof typeof notificationPreferences) => {
    setEditedNotifications({
      ...editedNotifications,
      [key]: !editedNotifications[key],
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Get the current user ID from auth
      const userId = (await supabase.auth.getSession()).data.session?.user.id;

      if (!userId) {
        showNotification({
          title: 'Error',
          message: 'You must be logged in to update your profile',
          type: 'error',
        });
        return;
      }

      // Update the profile in Supabase
      await updateProfile(userId, {
        first_name: editedName.split(' ')[0],
        last_name: editedName.split(' ').slice(1).join(' '),
        phone: editedPhone,
        auto_send_job_reports: editedAutoSendReports,
        // Note: We're not updating email as that would require auth verification
      });

      showNotification({
        title: 'Success',
        message: 'Profile updated successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to update profile. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    console.log('Logout button pressed');
    try {
      setLoading(true);

      // Try to sign out
      await signOut();
      console.log('Sign out API call completed');

      // No need for additional setTimeout or checks
      // The auth context will handle the navigation once signed out
    } catch (error) {
      console.error('Logout error:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to log out. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        {/* Profile Header */}
        <View className="mb-6 items-center">
          <TouchableOpacity
            className="mb-2 h-24 w-24 items-center justify-center rounded-full bg-gray-200"
            onPress={() => console.log('Change profile picture')}
          >
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={{ width: 24, height: 24, borderRadius: 24 }}
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
          <Text className="mb-3 text-lg font-semibold">
            Personal Information
          </Text>
          <View className="rounded-lg bg-gray-50 p-4">
            <View className="mb-4">
              <Text className="mb-1 text-sm text-gray-500">Full Name</Text>
              <TextInput
                className="rounded-md border border-gray-200 bg-white p-2"
                value={editedName}
                onChangeText={setEditedName}
              />
            </View>
            <View className="mb-4">
              <Text className="mb-1 text-sm text-gray-500">Email</Text>
              <TextInput
                className="rounded-md border border-gray-200 bg-white p-2"
                value={editedEmail}
                onChangeText={setEditedEmail}
                keyboardType="email-address"
              />
            </View>
            <View>
              <Text className="mb-1 text-sm text-gray-500">Phone</Text>
              <TextInput
                className="rounded-md border border-gray-200 bg-white p-2"
                value={editedPhone}
                onChangeText={setEditedPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* Skills */}
        <View className="mb-6">
          <Text className="mb-3 text-lg font-semibold">Skills & Expertise</Text>
          <View className="rounded-lg bg-gray-50 p-4">
            <TouchableOpacity
              className="mb-2 flex-row items-center justify-between rounded-md border border-gray-200 bg-white p-3"
              onPress={() => setShowSkillsDropdown(!showSkillsDropdown)}
            >
              <Text>
                {editedSkills.length > 0
                  ? `${editedSkills.length} skills selected`
                  : 'Select your skills'}
              </Text>
              <ChevronDown size={20} color="#6b7280" />
            </TouchableOpacity>

            {showSkillsDropdown && (
              <View className="mb-4 rounded-md border border-gray-200 bg-white p-2">
                {allSkillOptions.map((skill) => (
                  <TouchableOpacity
                    key={skill}
                    className="flex-row items-center py-2"
                    onPress={() => toggleSkill(skill)}
                  >
                    <View
                      className={`mr-2 h-5 w-5 rounded ${
                        editedSkills.includes(skill)
                          ? 'bg-green-500'
                          : 'border border-gray-300'
                      }`}
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
                  className="m-1 rounded-full bg-green-100 px-3 py-1"
                >
                  <Text className="text-sm text-green-800">{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Job Report Settings */}
        <View className="mb-6">
          <Text className="mb-3 text-lg font-semibold">
            Job Report Settings
          </Text>
          <View className="rounded-lg bg-gray-50 p-4">
            <View className="flex-row items-center justify-between py-3">
              <View className="flex-1 pr-4">
                <View className="mb-1 flex-row items-center">
                  <Mail size={16} color="#6b7280" style={{ marginRight: 8 }} />
                  <Text className="font-medium">Auto-Send Job Reports</Text>
                </View>
                <Text className="mt-1 text-sm text-gray-500">
                  Automatically email job reports to customers when you complete
                  a job. If disabled, admins can manually send reports.
                </Text>
              </View>
              <Switch
                value={editedAutoSendReports}
                onValueChange={setEditedAutoSendReports}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
              />
            </View>
          </View>
        </View>

        {/* Notification Preferences */}
        <View className="mb-6">
          <Text className="mb-3 text-lg font-semibold">
            Notification Preferences
          </Text>
          <View className="rounded-lg bg-gray-50 p-4">
            <View className="flex-row items-center justify-between border-b border-gray-200 py-3">
              <View className="flex-row items-center">
                <Bell size={16} color="#6b7280" className="mr-2" />
                <Text>New Job Assignments</Text>
              </View>
              <Switch
                value={editedNotifications.newJobs}
                onValueChange={() => toggleNotification('newJobs')}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
              />
            </View>
            <View className="flex-row items-center justify-between border-b border-gray-200 py-3">
              <View className="flex-row items-center">
                <Bell size={16} color="#6b7280" className="mr-2" />
                <Text>Schedule Changes</Text>
              </View>
              <Switch
                value={editedNotifications.scheduleChanges}
                onValueChange={() => toggleNotification('scheduleChanges')}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
              />
            </View>
            <View className="flex-row items-center justify-between border-b border-gray-200 py-3">
              <View className="flex-row items-center">
                <Bell size={16} color="#6b7280" className="mr-2" />
                <Text>Urgent Requests</Text>
              </View>
              <Switch
                value={editedNotifications.urgentRequests}
                onValueChange={() => toggleNotification('urgentRequests')}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
              />
            </View>
            <View className="flex-row items-center justify-between py-3">
              <View className="flex-row items-center">
                <Bell size={16} color="#6b7280" className="mr-2" />
                <Text>App Updates</Text>
              </View>
              <Switch
                value={editedNotifications.appUpdates}
                onValueChange={() => toggleNotification('appUpdates')}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
              />
            </View>
          </View>
        </View>

        {/* Account Settings Section - NEW */}
        <View className="mb-6">
          <Text className="mb-3 text-lg font-semibold">Account Settings</Text>
          <View className="rounded-lg bg-gray-50 p-4">
            <TouchableOpacity className="mb-2 flex-row items-center justify-between rounded-md bg-white p-3">
              <Text>Change Password</Text>
              <ChevronRight size={16} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-between rounded-md bg-white p-3"
              onPress={handleLogout}
              disabled={loadingState}
            >
              <View className="flex-row items-center">
                <LogOut size={16} color="#ef4444" />
                <Text className="ml-2 text-red-500">
                  {loadingState ? 'Logging out...' : 'Log Out'}
                </Text>
              </View>
              <ChevronRight size={16} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Button */}
        <View className="mb-8 mt-8 px-4">
          <TouchableOpacity
            className={`flex-row items-center justify-center rounded-lg bg-green-600 py-3 ${
              loadingState ? 'opacity-70' : ''
            }`}
            onPress={handleSave}
            disabled={loadingState}
          >
            {loadingState ? (
              <ActivityIndicator
                size="small"
                color="white"
                style={{ marginRight: 8 }}
              />
            ) : (
              <Save size={20} color="#ffffff" style={{ marginRight: 8 }} />
            )}
            <Text className="text-lg font-bold text-white">
              {loadingState ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default TechnicianProfile;
