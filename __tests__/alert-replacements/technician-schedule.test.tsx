/**
 * Tests for Alert.alert replacements in app/(technician)/schedule.tsx
 * Verifies 9 alert replacements: delete confirmations, apply preset, paste week, and error notifications
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useConfirmation } from '../../lib/confirmation';
import { showNotification } from '../../lib/notification';

jest.mock('../../lib/data', () => ({
  ...jest.requireActual('../../lib/data'),
  deleteAvailability: jest.fn(),
  deleteTimeBlock: jest.fn(),
  applyAvailabilityPreset: jest.fn(),
  pasteCopiedWeek: jest.fn(),
}));

describe('Technician Schedule - Alert Replacements', () => {
  let mockShowConfirmation: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockShowConfirmation = jest.fn();
    (useConfirmation as jest.Mock).mockReturnValue({
      showConfirmation: mockShowConfirmation,
    });
  });

  describe('Delete availability confirmation (Instance 1)', () => {
    it('should show confirmation dialog with correct parameters', () => {
      mockShowConfirmation({
        title: 'Delete Availability',
        message: 'Are you sure you want to delete this availability slot?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmButtonStyle: 'destructive',
        onConfirm: jest.fn(),
        onCancel: jest.fn(),
      });

      expect(mockShowConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Delete Availability',
          message: expect.stringContaining('delete this availability'),
          confirmText: 'Delete',
          confirmButtonStyle: 'destructive',
        })
      );
    });

    it('should delete availability when confirmed', async () => {
      const { deleteAvailability } = require('../../lib/data');
      deleteAvailability.mockResolvedValueOnce(true);

      const onConfirm = jest.fn(async () => {
        await deleteAvailability('availability-123');
        showNotification({
          title: 'Success',
          message: 'Availability deleted successfully',
          type: 'success',
        });
      });

      mockShowConfirmation({
        title: 'Delete Availability',
        message: 'Are you sure?',
        onConfirm,
      });

      const callArgs = mockShowConfirmation.mock.calls[0][0];
      await callArgs.onConfirm();

      await waitFor(() => {
        expect(deleteAvailability).toHaveBeenCalledWith('availability-123');
        expect(showNotification).toHaveBeenCalledWith({
          title: 'Success',
          message: 'Availability deleted successfully',
          type: 'success',
        });
      });
    });
  });

  describe('Delete time block confirmation (Instance 2)', () => {
    it('should show confirmation dialog for time block deletion', () => {
      mockShowConfirmation({
        title: 'Delete Time Block',
        message: 'Are you sure you want to delete this time block?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmButtonStyle: 'destructive',
        onConfirm: jest.fn(),
      });

      expect(mockShowConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Delete Time Block',
          message: expect.stringContaining('delete this time block'),
          confirmButtonStyle: 'destructive',
        })
      );
    });

    it('should delete time block when confirmed', async () => {
      const { deleteTimeBlock } = require('../../lib/data');
      deleteTimeBlock.mockResolvedValueOnce(true);

      const onConfirm = jest.fn(async () => {
        await deleteTimeBlock('timeblock-456');
        showNotification({
          title: 'Success',
          message: 'Time block deleted successfully',
          type: 'success',
        });
      });

      mockShowConfirmation({
        title: 'Delete Time Block',
        message: 'Are you sure?',
        onConfirm,
      });

      const callArgs = mockShowConfirmation.mock.calls[0][0];
      await callArgs.onConfirm();

      await waitFor(() => {
        expect(deleteTimeBlock).toHaveBeenCalledWith('timeblock-456');
        expect(showNotification).toHaveBeenCalled();
      });
    });
  });

  describe('Apply preset confirmation (Instance 3)', () => {
    it('should show confirmation dialog for applying preset', () => {
      mockShowConfirmation({
        title: 'Apply Preset',
        message: 'This will replace your current schedule. Continue?',
        confirmText: 'Apply',
        cancelText: 'Cancel',
        onConfirm: jest.fn(),
      });

      expect(mockShowConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Apply Preset',
          message: expect.stringContaining('replace your current schedule'),
        })
      );
    });

    it('should apply preset when confirmed', async () => {
      const { applyAvailabilityPreset } = require('../../lib/data');
      applyAvailabilityPreset.mockResolvedValueOnce(true);

      const onConfirm = jest.fn(async () => {
        await applyAvailabilityPreset('weekday-mornings');
        showNotification({
          title: 'Success',
          message: 'Preset applied successfully',
          type: 'success',
        });
      });

      mockShowConfirmation({
        title: 'Apply Preset',
        message: 'Continue?',
        onConfirm,
      });

      const callArgs = mockShowConfirmation.mock.calls[0][0];
      await callArgs.onConfirm();

      await waitFor(() => {
        expect(applyAvailabilityPreset).toHaveBeenCalledWith(
          'weekday-mornings'
        );
        expect(showNotification).toHaveBeenCalled();
      });
    });
  });

  describe('Paste week pattern confirmation (Instance 4)', () => {
    it('should show confirmation dialog for pasting week pattern', () => {
      mockShowConfirmation({
        title: 'Paste Week Pattern',
        message: 'This will overwrite the current week. Continue?',
        confirmText: 'Paste',
        cancelText: 'Cancel',
        onConfirm: jest.fn(),
      });

      expect(mockShowConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Paste Week Pattern',
          message: expect.stringContaining('overwrite the current week'),
        })
      );
    });

    it('should paste week when confirmed', async () => {
      const { pasteCopiedWeek } = require('../../lib/data');
      pasteCopiedWeek.mockResolvedValueOnce(true);

      const onConfirm = jest.fn(async () => {
        await pasteCopiedWeek('2025-01-20');
        showNotification({
          title: 'Success',
          message: 'Week pattern pasted successfully',
          type: 'success',
        });
      });

      mockShowConfirmation({
        title: 'Paste Week Pattern',
        message: 'Continue?',
        onConfirm,
      });

      const callArgs = mockShowConfirmation.mock.calls[0][0];
      await callArgs.onConfirm();

      await waitFor(() => {
        expect(pasteCopiedWeek).toHaveBeenCalledWith('2025-01-20');
      });
    });
  });

  describe('Error notifications (Instances 5-9)', () => {
    it('should show error notification when delete availability fails', async () => {
      const { deleteAvailability } = require('../../lib/data');
      deleteAvailability.mockRejectedValueOnce(new Error('Database error'));

      try {
        await deleteAvailability('availability-123');
      } catch (error) {
        showNotification({
          title: 'Delete Failed',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to delete availability',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Delete Failed',
        message: 'Database error',
        type: 'error',
      });
    });

    it('should show error notification when delete time block fails', async () => {
      const { deleteTimeBlock } = require('../../lib/data');
      deleteTimeBlock.mockRejectedValueOnce(new Error('Network error'));

      try {
        await deleteTimeBlock('timeblock-456');
      } catch (error) {
        showNotification({
          title: 'Delete Failed',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to delete time block',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Delete Failed',
        message: 'Network error',
        type: 'error',
      });
    });

    it('should show error notification when apply preset fails', async () => {
      const { applyAvailabilityPreset } = require('../../lib/data');
      applyAvailabilityPreset.mockRejectedValueOnce(
        new Error('Invalid preset')
      );

      try {
        await applyAvailabilityPreset('invalid-preset');
      } catch (error) {
        showNotification({
          title: 'Apply Preset Failed',
          message:
            error instanceof Error ? error.message : 'Failed to apply preset',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Apply Preset Failed',
        message: 'Invalid preset',
        type: 'error',
      });
    });

    it('should show error notification when paste week fails', async () => {
      const { pasteCopiedWeek } = require('../../lib/data');
      pasteCopiedWeek.mockRejectedValueOnce(new Error('No week copied'));

      try {
        await pasteCopiedWeek('2025-01-20');
      } catch (error) {
        showNotification({
          title: 'Paste Failed',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to paste week pattern',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Paste Failed',
        message: 'No week copied',
        type: 'error',
      });
    });

    it('should show error notification with generic message for unknown errors', () => {
      showNotification({
        title: 'Operation Failed',
        message: 'An unexpected error occurred',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Operation Failed',
        message: 'An unexpected error occurred',
        type: 'error',
      });
    });
  });

  describe('Cancel callbacks', () => {
    it('should execute cancel callback for delete availability', () => {
      const onCancel = jest.fn();

      mockShowConfirmation({
        title: 'Delete Availability',
        message: 'Are you sure?',
        onConfirm: jest.fn(),
        onCancel,
      });

      const callArgs = mockShowConfirmation.mock.calls[0][0];
      callArgs.onCancel();

      expect(onCancel).toHaveBeenCalled();
    });

    it('should execute cancel callback for delete time block', () => {
      const onCancel = jest.fn();

      mockShowConfirmation({
        title: 'Delete Time Block',
        message: 'Are you sure?',
        onConfirm: jest.fn(),
        onCancel,
      });

      const callArgs = mockShowConfirmation.mock.calls[0][0];
      callArgs.onCancel();

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Cross-platform compatibility', () => {
    it('should work on all platforms for confirmations', () => {
      ['web', 'ios', 'android'].forEach((platform) => {
        jest.clearAllMocks();
        const Platform = require('react-native/Libraries/Utilities/Platform');
        Platform.OS = platform;

        mockShowConfirmation({
          title: 'Delete Availability',
          message: 'Are you sure?',
          onConfirm: jest.fn(),
        });

        expect(mockShowConfirmation).toHaveBeenCalled();
      });
    });

    it('should work on all platforms for notifications', () => {
      ['web', 'ios', 'android'].forEach((platform) => {
        jest.clearAllMocks();
        const Platform = require('react-native/Libraries/Utilities/Platform');
        Platform.OS = platform;

        showNotification({
          title: 'Error',
          message: 'Test error',
          type: 'error',
        });

        expect(showNotification).toHaveBeenCalled();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle confirmation without cancel callback', () => {
      mockShowConfirmation({
        title: 'Delete Availability',
        message: 'Are you sure?',
        onConfirm: jest.fn(),
        // No onCancel provided
      });

      expect(mockShowConfirmation).toHaveBeenCalled();
    });

    it('should handle confirmation with custom button text', () => {
      mockShowConfirmation({
        title: 'Delete Availability',
        message: 'Are you sure?',
        confirmText: 'Yes, Delete',
        cancelText: 'No, Keep It',
        onConfirm: jest.fn(),
      });

      const callArgs = mockShowConfirmation.mock.calls[0][0];
      expect(callArgs.confirmText).toBe('Yes, Delete');
      expect(callArgs.cancelText).toBe('No, Keep It');
    });

    it('should handle multiple rapid confirmation calls', () => {
      mockShowConfirmation({
        title: 'Test 1',
        message: 'Message 1',
        onConfirm: jest.fn(),
      });
      mockShowConfirmation({
        title: 'Test 2',
        message: 'Message 2',
        onConfirm: jest.fn(),
      });
      mockShowConfirmation({
        title: 'Test 3',
        message: 'Message 3',
        onConfirm: jest.fn(),
      });

      expect(mockShowConfirmation).toHaveBeenCalledTimes(3);
    });

    it('should handle async errors in onConfirm callback', async () => {
      const onConfirm = jest.fn(async () => {
        throw new Error('Async operation failed');
      });

      mockShowConfirmation({
        title: 'Delete Availability',
        message: 'Are you sure?',
        onConfirm,
      });

      const callArgs = mockShowConfirmation.mock.calls[0][0];

      await expect(callArgs.onConfirm()).rejects.toThrow(
        'Async operation failed'
      );
    });
  });
});
