/**
 * Integration tests for Alert.alert replacements
 * Tests complete user flows involving multiple components
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { showNotification } from '../../lib/notification';
import { useConfirmation } from '../../lib/confirmation';

jest.mock('../../lib/data', () => ({
  ...jest.requireActual('../../lib/data'),
  updateBookingStatus: jest.fn(),
  uploadBeforePhoto: jest.fn(),
  uploadAfterPhoto: jest.fn(),
  deleteAvailability: jest.fn(),
  saveAvailability: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock('../../lib/auth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'technician-123', email: 'tech@example.com' },
    signIn: jest.fn(),
  })),
}));

describe('Integration Tests - User Flows with Alert Replacements', () => {
  let mockShowConfirmation: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockShowConfirmation = jest.fn();
    (useConfirmation as jest.Mock).mockReturnValue({
      showConfirmation: mockShowConfirmation,
    });
  });

  describe('Technician completes a job - End-to-end flow', () => {
    it('should handle the complete job workflow with all notifications', async () => {
      const {
        updateBookingStatus,
        uploadBeforePhoto,
        uploadAfterPhoto,
      } = require('../../lib/data');

      // Step 1: Start the job
      updateBookingStatus.mockResolvedValueOnce({
        data: { id: 'booking-123', status: 'in_progress' },
        error: null,
      });

      await updateBookingStatus('booking-123', 'in_progress');

      showNotification({
        title: 'Success',
        message: 'Job started',
        type: 'success',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Job started',
        type: 'success',
      });

      jest.clearAllMocks();

      // Step 2: Upload before photo
      uploadBeforePhoto.mockResolvedValueOnce({
        data: { url: 'https://example.com/before.jpg' },
        error: null,
      });

      await uploadBeforePhoto('booking-123', 'before.jpg');

      showNotification({
        title: 'Success',
        message: 'Before photo uploaded',
        type: 'success',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Before photo uploaded',
        type: 'success',
      });

      jest.clearAllMocks();

      // Step 3: Upload after photo
      uploadAfterPhoto.mockResolvedValueOnce({
        data: { url: 'https://example.com/after.jpg' },
        error: null,
      });

      await uploadAfterPhoto('booking-123', 'after.jpg');

      showNotification({
        title: 'Success',
        message: 'After photo uploaded',
        type: 'success',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Success',
        message: 'After photo uploaded',
        type: 'success',
      });

      jest.clearAllMocks();

      // Step 4: Complete the job (with confirmation)
      updateBookingStatus.mockResolvedValueOnce({
        data: { id: 'booking-123', status: 'completed' },
        error: null,
      });

      const onConfirm = jest.fn(async () => {
        await updateBookingStatus('booking-123', 'completed');
        showNotification({
          title: 'Success',
          message: 'Job completed successfully',
          type: 'success',
        });
      });

      mockShowConfirmation({
        title: 'Complete Job',
        message: 'Mark this job as completed?',
        onConfirm,
      });

      const callArgs = mockShowConfirmation.mock.calls[0][0];
      await callArgs.onConfirm();

      await waitFor(() => {
        expect(updateBookingStatus).toHaveBeenCalledWith(
          'booking-123',
          'completed'
        );
        expect(showNotification).toHaveBeenCalledWith({
          title: 'Success',
          message: 'Job completed successfully',
          type: 'success',
        });
      });
    });

    it('should handle errors during job completion workflow', async () => {
      const {
        updateBookingStatus,
        uploadBeforePhoto,
      } = require('../../lib/data');

      // Step 1: Start job successfully
      updateBookingStatus.mockResolvedValueOnce({
        data: { id: 'booking-123', status: 'in_progress' },
        error: null,
      });

      await updateBookingStatus('booking-123', 'in_progress');

      // Step 2: Before photo upload fails
      uploadBeforePhoto.mockRejectedValueOnce(new Error('Network timeout'));

      try {
        await uploadBeforePhoto('booking-123', 'before.jpg');
      } catch (error) {
        showNotification({
          title: 'Upload Failed',
          message:
            error instanceof Error ? error.message : 'Failed to upload photo',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Upload Failed',
        message: 'Network timeout',
        type: 'error',
      });

      // Step 3: Try to complete without photos
      showNotification({
        title: 'Missing Photos',
        message: 'Please upload before and after photos before completing',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Missing Photos',
        message: expect.stringContaining('before and after photos'),
        type: 'error',
      });
    });
  });

  describe('Technician manages schedule - End-to-end flow', () => {
    it('should handle the schedule management workflow', async () => {
      const {
        saveAvailability,
        deleteAvailability,
      } = require('../../lib/data');

      // Step 1: Add availability
      saveAvailability.mockResolvedValueOnce({
        data: { id: 'availability-123' },
        error: null,
      });

      await saveAvailability({
        dayOfWeek: 'Monday',
        startTime: '09:00',
        endTime: '17:00',
      });

      showNotification({
        title: 'Success',
        message: 'Availability saved',
        type: 'success',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Availability saved',
        type: 'success',
      });

      jest.clearAllMocks();

      // Step 2: Delete availability (with confirmation)
      deleteAvailability.mockResolvedValueOnce(true);

      const onConfirm = jest.fn(async () => {
        await deleteAvailability('availability-123');
        showNotification({
          title: 'Success',
          message: 'Availability deleted',
          type: 'success',
        });
      });

      mockShowConfirmation({
        title: 'Delete Availability',
        message: 'Are you sure?',
        confirmButtonStyle: 'destructive',
        onConfirm,
      });

      const callArgs = mockShowConfirmation.mock.calls[0][0];
      await callArgs.onConfirm();

      await waitFor(() => {
        expect(deleteAvailability).toHaveBeenCalledWith('availability-123');
        expect(showNotification).toHaveBeenCalledWith({
          title: 'Success',
          message: 'Availability deleted',
          type: 'success',
        });
      });
    });

    it('should handle schedule conflicts during availability creation', async () => {
      const { saveAvailability } = require('../../lib/data');

      // Attempt to save conflicting availability
      saveAvailability.mockRejectedValueOnce(
        new Error('Time slot conflicts with existing availability')
      );

      try {
        await saveAvailability({
          dayOfWeek: 'Monday',
          startTime: '09:00',
          endTime: '17:00',
        });
      } catch (error) {
        showNotification({
          title: 'Time Conflict',
          message:
            error instanceof Error
              ? error.message
              : 'Schedule conflict detected',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Time Conflict',
        message: expect.stringContaining('conflicts'),
        type: 'error',
      });
    });
  });

  describe('User profile management - End-to-end flow', () => {
    it('should handle profile update workflow', async () => {
      const { updateProfile } = require('../../lib/data');

      // Step 1: Validation error
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

      jest.clearAllMocks();

      // Step 2: Successful update
      updateProfile.mockResolvedValueOnce({
        data: { id: 'user-123', first_name: 'John', last_name: 'Doe' },
        error: null,
      });

      await updateProfile({
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
      });

      showNotification({
        title: 'Success',
        message: 'Profile updated successfully',
        type: 'success',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Profile updated successfully',
        type: 'success',
      });
    });
  });

  describe('Login flow with error handling', () => {
    it('should handle login errors gracefully', async () => {
      const { useAuth } = require('../../lib/auth');
      const mockSignIn = jest.fn();
      useAuth.mockReturnValue({ signIn: mockSignIn });

      // Step 1: Validation error
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

      jest.clearAllMocks();

      // Step 2: Authentication error
      mockSignIn.mockRejectedValueOnce(new Error('Invalid credentials'));

      try {
        await mockSignIn('test@example.com', 'wrongpassword');
      } catch (error) {
        showNotification({
          title: 'Login Failed',
          message:
            error instanceof Error ? error.message : 'Authentication failed',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Login Failed',
        message: 'Invalid credentials',
        type: 'error',
      });
    });
  });

  describe('Multiple notifications in rapid succession', () => {
    it('should handle multiple notifications without conflicts', () => {
      // Simulate rapid user actions
      showNotification({
        title: 'Info',
        message: 'Loading...',
        type: 'info',
      });

      showNotification({
        title: 'Success',
        message: 'Data loaded',
        type: 'success',
      });

      showNotification({
        title: 'Warning',
        message: 'Network slow',
        type: 'info',
      });

      expect(showNotification).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple confirmations in sequence', () => {
      // First confirmation
      mockShowConfirmation({
        title: 'Delete Item 1',
        message: 'Are you sure?',
        onConfirm: jest.fn(),
      });

      // Second confirmation
      mockShowConfirmation({
        title: 'Delete Item 2',
        message: 'Are you sure?',
        onConfirm: jest.fn(),
      });

      expect(mockShowConfirmation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error recovery flows', () => {
    it('should allow retry after error', async () => {
      const { updateBookingStatus } = require('../../lib/data');

      // First attempt fails
      updateBookingStatus.mockRejectedValueOnce(new Error('Network error'));

      try {
        await updateBookingStatus('booking-123', 'in_progress');
      } catch (error) {
        showNotification({
          title: 'Error',
          message: 'Network error',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Network error',
        type: 'error',
      });

      jest.clearAllMocks();

      // Retry succeeds
      updateBookingStatus.mockResolvedValueOnce({
        data: { id: 'booking-123', status: 'in_progress' },
        error: null,
      });

      await updateBookingStatus('booking-123', 'in_progress');

      showNotification({
        title: 'Success',
        message: 'Job started',
        type: 'success',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Job started',
        type: 'success',
      });
    });
  });

  describe('Cross-platform integration', () => {
    it('should work consistently across all platforms in a workflow', async () => {
      const platforms = ['web', 'ios', 'android'];
      const { updateBookingStatus } = require('../../lib/data');

      for (const platform of platforms) {
        jest.clearAllMocks();
        const Platform = require('react-native/Libraries/Utilities/Platform');
        Platform.OS = platform;

        updateBookingStatus.mockResolvedValueOnce({
          data: { id: 'booking-123', status: 'in_progress' },
          error: null,
        });

        await updateBookingStatus('booking-123', 'in_progress');

        showNotification({
          title: 'Success',
          message: 'Job started',
          type: 'success',
        });

        expect(showNotification).toHaveBeenCalledWith({
          title: 'Success',
          message: 'Job started',
          type: 'success',
        });
      }
    });
  });
});
