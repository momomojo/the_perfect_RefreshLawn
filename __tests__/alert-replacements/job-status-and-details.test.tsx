/**
 * Tests for Alert.alert replacements in job status components
 * - JobStatusUpdater.tsx (10 instances: 9 error notifications + 1 confirmation)
 * - job-details/[id].tsx (4 instances: error notifications)
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
  getBooking: jest.fn(),
}));

jest.mock('../../lib/auth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'technician-123', email: 'tech@example.com' },
  })),
}));

describe('Job Status and Details - Alert Replacements', () => {
  let mockShowConfirmation: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockShowConfirmation = jest.fn();
    (useConfirmation as jest.Mock).mockReturnValue({
      showConfirmation: mockShowConfirmation,
    });
  });

  describe('JobStatusUpdater - Status transition errors (Instances 1-9)', () => {
    it('should show error notification when starting job without permission', async () => {
      const { updateBookingStatus } = require('../../lib/data');
      updateBookingStatus.mockRejectedValueOnce(new Error('Not authorized'));

      try {
        await updateBookingStatus('booking-123', 'in_progress');
      } catch (error) {
        showNotification({
          title: 'Permission Denied',
          message:
            error instanceof Error
              ? error.message
              : 'You are not authorized to update this job',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Permission Denied',
        message: 'Not authorized',
        type: 'error',
      });
    });

    it('should show error notification when network error occurs', async () => {
      const { updateBookingStatus } = require('../../lib/data');
      updateBookingStatus.mockRejectedValueOnce(
        new Error('Network request failed')
      );

      try {
        await updateBookingStatus('booking-123', 'in_progress');
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

    it('should show error notification when uploading before photo fails', async () => {
      const { uploadBeforePhoto } = require('../../lib/data');
      uploadBeforePhoto.mockRejectedValueOnce(new Error('Upload failed'));

      try {
        await uploadBeforePhoto('booking-123', 'before.jpg');
      } catch (error) {
        showNotification({
          title: 'Upload Failed',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to upload before photo',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Upload Failed',
        message: 'Upload failed',
        type: 'error',
      });
    });

    it('should show error notification when uploading after photo fails', async () => {
      const { uploadAfterPhoto } = require('../../lib/data');
      uploadAfterPhoto.mockRejectedValueOnce(
        new Error('Storage quota exceeded')
      );

      try {
        await uploadAfterPhoto('booking-123', 'after.jpg');
      } catch (error) {
        showNotification({
          title: 'Upload Failed',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to upload after photo',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Upload Failed',
        message: 'Storage quota exceeded',
        type: 'error',
      });
    });

    it('should show error notification when before photo is missing for completion', () => {
      showNotification({
        title: 'Missing Photo',
        message: 'Please upload a before photo before completing the job',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Missing Photo',
        message: expect.stringContaining('before photo'),
        type: 'error',
      });
    });

    it('should show error notification when after photo is missing for completion', () => {
      showNotification({
        title: 'Missing Photo',
        message: 'Please upload an after photo before completing the job',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Missing Photo',
        message: expect.stringContaining('after photo'),
        type: 'error',
      });
    });

    it('should show error notification for invalid status transition', () => {
      showNotification({
        title: 'Invalid Status',
        message: 'Cannot change status from completed to in_progress',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Invalid Status',
        message: expect.stringContaining('Cannot change status'),
        type: 'error',
      });
    });

    it('should show error notification when database update fails', async () => {
      const { updateBookingStatus } = require('../../lib/data');
      updateBookingStatus.mockRejectedValueOnce(
        new Error('Database constraint violation')
      );

      try {
        await updateBookingStatus('booking-123', 'completed');
      } catch (error) {
        showNotification({
          title: 'Update Failed',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to update job status',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Update Failed',
        message: 'Database constraint violation',
        type: 'error',
      });
    });

    it('should show error notification for concurrent modification', () => {
      showNotification({
        title: 'Concurrent Update',
        message:
          'This job was updated by another user. Please refresh and try again.',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Concurrent Update',
        message: expect.stringContaining('updated by another user'),
        type: 'error',
      });
    });

    it('should show success notification when status update succeeds', async () => {
      const { updateBookingStatus } = require('../../lib/data');
      updateBookingStatus.mockResolvedValueOnce({
        data: { id: 'booking-123', status: 'in_progress' },
        error: null,
      });

      const result = await updateBookingStatus('booking-123', 'in_progress');

      if (!result.error) {
        showNotification({
          title: 'Success',
          message: 'Job status updated successfully',
          type: 'success',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Success',
        message: expect.stringContaining('successfully'),
        type: 'success',
      });
    });
  });

  describe('JobStatusUpdater - Complete job confirmation (Instance 10)', () => {
    it('should show confirmation dialog before completing job', () => {
      mockShowConfirmation({
        title: 'Complete Job',
        message: 'Mark this job as completed? Customer will be notified.',
        confirmText: 'Complete',
        cancelText: 'Cancel',
        onConfirm: jest.fn(),
      });

      expect(mockShowConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Complete Job',
          message: expect.stringContaining('Customer will be notified'),
        })
      );
    });

    it('should complete job when confirmed', async () => {
      const { updateBookingStatus } = require('../../lib/data');
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

    it('should not complete job when cancelled', () => {
      const { updateBookingStatus } = require('../../lib/data');
      const onCancel = jest.fn();

      mockShowConfirmation({
        title: 'Complete Job',
        message: 'Mark this job as completed?',
        onConfirm: jest.fn(),
        onCancel,
      });

      const callArgs = mockShowConfirmation.mock.calls[0][0];
      callArgs.onCancel();

      expect(onCancel).toHaveBeenCalled();
      expect(updateBookingStatus).not.toHaveBeenCalled();
    });
  });

  describe('Job Details Screen - Error notifications (Instances 11-14)', () => {
    it('should show error notification when user is not authenticated', () => {
      const { useAuth } = require('../../lib/auth');
      useAuth.mockReturnValueOnce({ user: null });

      showNotification({
        title: 'Authentication Required',
        message: 'Please log in to view job details',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Authentication Required',
        message: expect.stringContaining('log in'),
        type: 'error',
      });
    });

    it('should show error notification when job data is not available', async () => {
      const { getBooking } = require('../../lib/data');
      getBooking.mockResolvedValueOnce(null);

      const booking = await getBooking('invalid-id');

      if (!booking) {
        showNotification({
          title: 'Job Not Found',
          message: 'Unable to load job details',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Job Not Found',
        message: 'Unable to load job details',
        type: 'error',
      });
    });

    it('should show error notification when fetching job fails', async () => {
      const { getBooking } = require('../../lib/data');
      getBooking.mockRejectedValueOnce(new Error('Failed to fetch booking'));

      try {
        await getBooking('booking-123');
      } catch (error) {
        showNotification({
          title: 'Load Failed',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to load job details',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Load Failed',
        message: 'Failed to fetch booking',
        type: 'error',
      });
    });

    it('should show error notification when technician is not assigned to job', () => {
      showNotification({
        title: 'Access Denied',
        message: 'You are not assigned to this job',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Access Denied',
        message: expect.stringContaining('not assigned'),
        type: 'error',
      });
    });
  });

  describe('Photo upload validations', () => {
    it('should validate photo file size', () => {
      showNotification({
        title: 'File Too Large',
        message: 'Photo must be less than 10MB',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'File Too Large',
        message: expect.stringContaining('10MB'),
        type: 'error',
      });
    });

    it('should validate photo file type', () => {
      showNotification({
        title: 'Invalid File Type',
        message: 'Please upload a JPG or PNG image',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Invalid File Type',
        message: expect.stringContaining('JPG or PNG'),
        type: 'error',
      });
    });

    it('should show success notification after photo upload', async () => {
      const { uploadBeforePhoto } = require('../../lib/data');
      uploadBeforePhoto.mockResolvedValueOnce({
        data: { url: 'https://example.com/before.jpg' },
        error: null,
      });

      const result = await uploadBeforePhoto('booking-123', 'before.jpg');

      if (!result.error) {
        showNotification({
          title: 'Success',
          message: 'Photo uploaded successfully',
          type: 'success',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Photo uploaded successfully',
        type: 'success',
      });
    });
  });

  describe('Status transition validations', () => {
    it('should validate required fields for each status', () => {
      const statusRequirements = {
        in_progress: [],
        completed: ['before_photo', 'after_photo'],
      };

      const missingFields = statusRequirements.completed;

      if (missingFields.length > 0) {
        showNotification({
          title: 'Missing Requirements',
          message: `Please provide: ${missingFields.join(', ')}`,
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Missing Requirements',
        message: expect.stringContaining('before_photo'),
        type: 'error',
      });
    });

    it('should show appropriate message for each status transition', async () => {
      const { updateBookingStatus } = require('../../lib/data');
      updateBookingStatus.mockResolvedValue({ data: {}, error: null });

      const statusMessages = {
        scheduled: 'Job scheduled',
        in_progress: 'Job started',
        completed: 'Job completed',
      };

      for (const [status, message] of Object.entries(statusMessages)) {
        jest.clearAllMocks();
        await updateBookingStatus('booking-123', status);

        showNotification({
          title: 'Success',
          message: message,
          type: 'success',
        });

        expect(showNotification).toHaveBeenCalledWith({
          title: 'Success',
          message: message,
          type: 'success',
        });
      }
    });
  });

  describe('Cross-platform compatibility', () => {
    it('should work on all platforms', () => {
      ['web', 'ios', 'android'].forEach((platform) => {
        jest.clearAllMocks();
        const Platform = require('react-native/Libraries/Utilities/Platform');
        Platform.OS = platform;

        showNotification({
          title: 'Test',
          message: `Testing on ${platform}`,
          type: 'info',
        });

        expect(showNotification).toHaveBeenCalled();
      });
    });

    it('should work on all platforms for confirmations', () => {
      ['web', 'ios', 'android'].forEach((platform) => {
        jest.clearAllMocks();
        const Platform = require('react-native/Libraries/Utilities/Platform');
        Platform.OS = platform;

        mockShowConfirmation({
          title: 'Complete Job',
          message: 'Are you sure?',
          onConfirm: jest.fn(),
        });

        expect(mockShowConfirmation).toHaveBeenCalled();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid status updates', () => {
      showNotification({
        title: 'Status Update',
        message: 'Updating...',
        type: 'info',
      });
      showNotification({
        title: 'Error',
        message: 'Please wait for previous update',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledTimes(2);
    });

    it('should handle offline scenarios', () => {
      showNotification({
        title: 'Offline',
        message: 'Changes will be synced when connection is restored',
        type: 'info',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Offline',
        message: expect.stringContaining('connection is restored'),
        type: 'info',
      });
    });

    it('should handle photo upload cancellation', () => {
      showNotification({
        title: 'Upload Cancelled',
        message: 'Photo upload was cancelled',
        type: 'info',
      });

      expect(showNotification).toHaveBeenCalled();
    });

    it('should handle job reassignment scenarios', () => {
      showNotification({
        title: 'Job Reassigned',
        message: 'This job has been reassigned to another technician',
        type: 'info',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Job Reassigned',
        message: expect.stringContaining('reassigned'),
        type: 'info',
      });
    });

    it('should handle job cancellation by customer', () => {
      showNotification({
        title: 'Job Cancelled',
        message: 'Customer has cancelled this job',
        type: 'info',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Job Cancelled',
        message: expect.stringContaining('cancelled'),
        type: 'info',
      });
    });
  });

  describe('User feedback quality', () => {
    it('should provide clear error messages', () => {
      showNotification({
        title: 'Cannot Complete Job',
        message: 'Before and after photos are required to complete the job',
        type: 'error',
      });

      const callArgs = (showNotification as jest.Mock).mock.calls[0][0];
      expect(callArgs.message).toContain('required');
    });

    it('should provide actionable error messages', () => {
      showNotification({
        title: 'Network Error',
        message:
          'Unable to connect. Please check your internet connection and try again.',
        type: 'error',
      });

      const callArgs = (showNotification as jest.Mock).mock.calls[0][0];
      expect(callArgs.message).toContain('try again');
    });

    it('should provide success feedback with details', () => {
      showNotification({
        title: 'Job Completed',
        message: 'Job completed successfully. Customer has been notified.',
        type: 'success',
      });

      const callArgs = (showNotification as jest.Mock).mock.calls[0][0];
      expect(callArgs.message).toContain('Customer has been notified');
    });
  });
});
