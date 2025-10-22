import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import { useAuth } from '../../../lib/auth';
import { showNotification } from '../../../lib/notification';

const LoginForm = () => {
  const { signIn, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      showNotification({
        title: 'Error',
        message: 'Please enter both email and password',
        type: 'error',
      });
      return;
    }

    try {
      await signIn(email, password);
    } catch (error) {
      // Error is handled in the auth context
      console.error('Login error:', error);
    }
  };

  return (
    <View className="w-full max-w-sm rounded-lg bg-white p-6 shadow-md">
      <Text className="mb-6 text-center text-2xl font-bold text-green-800">
        Login
      </Text>

      <View className="mb-4">
        <Text className="mb-1 text-sm font-medium text-gray-700">Email</Text>
        <View className="flex-row items-center rounded-md border border-gray-300 bg-gray-50 px-3 py-2">
          <Mail size={20} color="#4B5563" />
          <TextInput
            className="ml-2 flex-1 text-base text-gray-900"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View className="mb-6">
        <Text className="mb-1 text-sm font-medium text-gray-700">Password</Text>
        <View className="flex-row items-center rounded-md border border-gray-300 bg-gray-50 px-3 py-2">
          <Lock size={20} color="#4B5563" />
          <TextInput
            className="ml-2 flex-1 text-base text-gray-900"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            {showPassword ? (
              <EyeOff size={20} color="#4B5563" />
            ) : (
              <Eye size={20} color="#4B5563" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View className="mb-4">
          <Text className="text-sm text-red-500">{error}</Text>
        </View>
      )}

      <TouchableOpacity
        className={`w-full rounded-md py-3 ${
          loading ? 'bg-green-400' : 'bg-green-600'
        }`}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-center font-semibold text-white">Sign In</Text>
        )}
      </TouchableOpacity>

      <View className="mt-4 flex-row justify-between">
        <Link href="/(auth)/forgot-password" asChild>
          <TouchableOpacity>
            <Text className="text-sm text-green-700">Forgot Password?</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/(auth)/register" asChild>
          <TouchableOpacity>
            <Text className="text-sm text-green-700">Create Account</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
};

export default LoginForm;
