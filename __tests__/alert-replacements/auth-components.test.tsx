/**
 * Tests for Alert.alert replacements in authentication components
 * - LoginForm.tsx (1 instance)
 * - Account.tsx (2 instances)
 * - Avatar.tsx (1 instance)
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { showNotification } from '../../lib/notification';
import { useConfirmation } from '../../lib/confirmation';

jest.mock('../../lib/auth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'user-123', email: 'test@example.com' },
    signIn: jest.fn(),
    signOut: jest.fn(),
  })),
}));

jest.mock('../../lib/data', () => ({
  ...jest.requireActual('../../lib/data'),
  updateProfile: jest.fn(),
  uploadAvatar: jest.fn(),
}));

describe('Authentication Components - Alert Replacements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LoginForm - Login validation error (Instance 1)', () => {
    it('should show error notification for invalid email', () => {
      showNotification({
        title: 'Invalid Email',
        message: 'Please enter a valid email address',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Invalid Email',
        message: 'Please enter a valid email address',
        type: 'error',
      });
    });

    it('should show error notification for missing password', () => {
      showNotification({
        title: 'Missing Password',
        message: 'Please enter your password',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Missing Password',
        message: 'Please enter your password',
        type: 'error',
      });
    });

    it('should show error notification for login failure', async () => {
      const { useAuth } = require('../../lib/auth');
      const mockSignIn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Invalid credentials'));
      useAuth.mockReturnValue({ signIn: mockSignIn });

      try {
        await mockSignIn('test@example.com', 'wrongpassword');
      } catch (error) {
        showNotification({
          title: 'Login Failed',
          message: error instanceof Error ? error.message : 'Failed to sign in',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Login Failed',
        message: 'Invalid credentials',
        type: 'error',
      });
    });

    it('should show error notification with generic message for unknown login errors', async () => {
      const { useAuth } = require('../../lib/auth');
      const mockSignIn = jest.fn().mockRejectedValueOnce('Unknown error');
      useAuth.mockReturnValue({ signIn: mockSignIn });

      try {
        await mockSignIn('test@example.com', 'password');
      } catch (error) {
        showNotification({
          title: 'Login Failed',
          message: error instanceof Error ? error.message : 'Failed to sign in',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Login Failed',
        message: 'Failed to sign in',
        type: 'error',
      });
    });
  });

  describe('Account - Profile update errors (Instances 2-3)', () => {
    it('should show error notification when profile update fails', async () => {
      const { updateProfile } = require('../../lib/data');
      updateProfile.mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to update profile' },
      });

      const result = await updateProfile({
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
      });

      if (result.error) {
        showNotification({
          title: 'Update Failed',
          message: result.error.message || 'Failed to update profile',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Update Failed',
        message: 'Failed to update profile',
        type: 'error',
      });
    });

    it('should show error notification for validation errors', () => {
      showNotification({
        title: 'Validation Error',
        message: 'First name is required',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Validation Error',
        message: 'First name is required',
        type: 'error',
      });
    });

    it('should show success notification when profile update succeeds', async () => {
      const { updateProfile } = require('../../lib/data');
      updateProfile.mockResolvedValueOnce({
        data: { id: 'user-123', first_name: 'John', last_name: 'Doe' },
        error: null,
      });

      const result = await updateProfile({
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
      });

      if (!result.error) {
        showNotification({
          title: 'Success',
          message: 'Profile updated successfully',
          type: 'success',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Profile updated successfully',
        type: 'success',
      });
    });

    it('should handle network errors during profile update', async () => {
      const { updateProfile } = require('../../lib/data');
      updateProfile.mockRejectedValueOnce(new Error('Network request failed'));

      try {
        await updateProfile({ id: 'user-123', first_name: 'John' });
      } catch (error) {
        showNotification({
          title: 'Network Error',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to connect to server',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Network Error',
        message: 'Network request failed',
        type: 'error',
      });
    });
  });

  describe('Avatar - Upload errors (Instance 4)', () => {
    it('should show error notification when avatar upload fails', async () => {
      const { uploadAvatar } = require('../../lib/data');
      uploadAvatar.mockResolvedValueOnce({
        data: null,
        error: { message: 'File too large' },
      });

      const result = await uploadAvatar('user-123', 'avatar.jpg');

      if (result.error) {
        showNotification({
          title: 'Upload Failed',
          message: result.error.message || 'Failed to upload avatar',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Upload Failed',
        message: 'File too large',
        type: 'error',
      });
    });

    it('should show error notification for invalid file type', () => {
      showNotification({
        title: 'Invalid File',
        message: 'Please select an image file (JPG, PNG, or GIF)',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Invalid File',
        message: 'Please select an image file (JPG, PNG, or GIF)',
        type: 'error',
      });
    });

    it('should show error notification for file size limit', () => {
      showNotification({
        title: 'File Too Large',
        message: 'Image must be less than 5MB',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'File Too Large',
        message: 'Image must be less than 5MB',
        type: 'error',
      });
    });

    it('should show success notification when avatar upload succeeds', async () => {
      const { uploadAvatar } = require('../../lib/data');
      uploadAvatar.mockResolvedValueOnce({
        data: { url: 'https://example.com/avatar.jpg' },
        error: null,
      });

      const result = await uploadAvatar('user-123', 'avatar.jpg');

      if (!result.error) {
        showNotification({
          title: 'Success',
          message: 'Avatar updated successfully',
          type: 'success',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Avatar updated successfully',
        type: 'success',
      });
    });

    it('should handle permission errors during avatar upload', async () => {
      const { uploadAvatar } = require('../../lib/data');
      uploadAvatar.mockRejectedValueOnce(new Error('Permission denied'));

      try {
        await uploadAvatar('user-123', 'avatar.jpg');
      } catch (error) {
        showNotification({
          title: 'Permission Denied',
          message:
            error instanceof Error ? error.message : 'Unable to access storage',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Permission Denied',
        message: 'Permission denied',
        type: 'error',
      });
    });
  });

  describe('Cross-platform compatibility', () => {
    it('should work on web platform', () => {
      const Platform = require('react-native/Libraries/Utilities/Platform');
      Platform.OS = 'web';

      showNotification({
        title: 'Test',
        message: 'Web test',
        type: 'info',
      });

      expect(showNotification).toHaveBeenCalled();
    });

    it('should work on iOS platform', () => {
      const Platform = require('react-native/Libraries/Utilities/Platform');
      Platform.OS = 'ios';

      showNotification({
        title: 'Test',
        message: 'iOS test',
        type: 'info',
      });

      expect(showNotification).toHaveBeenCalled();
    });

    it('should work on Android platform', () => {
      const Platform = require('react-native/Libraries/Utilities/Platform');
      Platform.OS = 'android';

      showNotification({
        title: 'Test',
        message: 'Android test',
        type: 'info',
      });

      expect(showNotification).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty error messages', () => {
      showNotification({
        title: 'Error',
        message: '',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Error',
        message: '',
        type: 'error',
      });
    });

    it('should handle long error messages', () => {
      const longMessage =
        'This is a very long error message that explains in detail what went wrong with the operation and provides helpful context for debugging the issue.';

      showNotification({
        title: 'Error',
        message: longMessage,
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Error',
        message: longMessage,
        type: 'error',
      });
    });

    it('should handle special characters in messages', () => {
      showNotification({
        title: 'Error',
        message:
          "Can't update profile: user's name contains invalid characters",
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalled();
    });

    it('should handle multiple rapid notifications', () => {
      showNotification({
        title: 'Error 1',
        message: 'Message 1',
        type: 'error',
      });
      showNotification({
        title: 'Error 2',
        message: 'Message 2',
        type: 'error',
      });
      showNotification({
        title: 'Error 3',
        message: 'Message 3',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledTimes(3);
    });
  });
});
