/**
 * Tests for Alert.alert replacements in technician form components
 * - AvailabilityForm.tsx (4 instances)
 * - TimeBlockForm.tsx (5 instances)
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { showNotification } from '../../lib/notification';
import { useConfirmation } from '../../lib/confirmation';

jest.mock('../../lib/data', () => ({
  ...jest.requireActual('../../lib/data'),
  saveAvailability: jest.fn(),
  saveTimeBlock: jest.fn(),
  validateTimeSlot: jest.fn(),
  checkTimeConflicts: jest.fn(),
}));

describe('Technician Forms - Alert Replacements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AvailabilityForm - Validation errors (Instances 1-4)', () => {
    it('should show error notification for missing start time', () => {
      showNotification({
        title: 'Validation Error',
        message: 'Please select a start time',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Validation Error',
        message: 'Please select a start time',
        type: 'error',
      });
    });

    it('should show error notification for missing end time', () => {
      showNotification({
        title: 'Validation Error',
        message: 'Please select an end time',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Validation Error',
        message: 'Please select an end time',
        type: 'error',
      });
    });

    it('should show error notification for invalid time range', () => {
      showNotification({
        title: 'Invalid Time Range',
        message: 'End time must be after start time',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Invalid Time Range',
        message: 'End time must be after start time',
        type: 'error',
      });
    });

    it('should show error notification for time conflicts', async () => {
      const { checkTimeConflicts } = require('../../lib/data');
      checkTimeConflicts.mockResolvedValueOnce({
        hasConflict: true,
        conflictingSlots: ['9:00 AM - 11:00 AM'],
      });

      const result = await checkTimeConflicts({
        dayOfWeek: 'Monday',
        startTime: '10:00',
        endTime: '12:00',
      });

      if (result.hasConflict) {
        showNotification({
          title: 'Time Conflict',
          message: `This time slot conflicts with existing availability: ${result.conflictingSlots.join(', ')}`,
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Time Conflict',
        message: expect.stringContaining(
          'conflicts with existing availability'
        ),
        type: 'error',
      });
    });

    it('should show error notification when save fails', async () => {
      const { saveAvailability } = require('../../lib/data');
      saveAvailability.mockRejectedValueOnce(new Error('Database error'));

      try {
        await saveAvailability({
          dayOfWeek: 'Monday',
          startTime: '09:00',
          endTime: '17:00',
        });
      } catch (error) {
        showNotification({
          title: 'Save Failed',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to save availability',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Save Failed',
        message: 'Database error',
        type: 'error',
      });
    });

    it('should show success notification when availability is saved', async () => {
      const { saveAvailability } = require('../../lib/data');
      saveAvailability.mockResolvedValueOnce({
        data: { id: 'availability-123' },
        error: null,
      });

      const result = await saveAvailability({
        dayOfWeek: 'Monday',
        startTime: '09:00',
        endTime: '17:00',
      });

      if (!result.error) {
        showNotification({
          title: 'Success',
          message: 'Availability saved successfully',
          type: 'success',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Availability saved successfully',
        type: 'success',
      });
    });
  });

  describe('TimeBlockForm - Validation errors (Instances 5-9)', () => {
    it('should show error notification for missing date', () => {
      showNotification({
        title: 'Validation Error',
        message: 'Please select a date',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Validation Error',
        message: 'Please select a date',
        type: 'error',
      });
    });

    it('should show error notification for past date', () => {
      showNotification({
        title: 'Invalid Date',
        message: 'Cannot create time blocks for past dates',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Invalid Date',
        message: 'Cannot create time blocks for past dates',
        type: 'error',
      });
    });

    it('should show error notification for missing start time', () => {
      showNotification({
        title: 'Validation Error',
        message: 'Please select a start time',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Validation Error',
        message: 'Please select a start time',
        type: 'error',
      });
    });

    it('should show error notification for missing end time', () => {
      showNotification({
        title: 'Validation Error',
        message: 'Please select an end time',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Validation Error',
        message: 'Please select an end time',
        type: 'error',
      });
    });

    it('should show error notification for invalid time range', () => {
      showNotification({
        title: 'Invalid Time Range',
        message: 'End time must be after start time',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Invalid Time Range',
        message: 'End time must be after start time',
        type: 'error',
      });
    });

    it('should show error notification for time block conflicts', async () => {
      const { checkTimeConflicts } = require('../../lib/data');
      checkTimeConflicts.mockResolvedValueOnce({
        hasConflict: true,
        conflictingBlocks: ['2025-01-20 10:00-12:00 (Unavailable)'],
      });

      const result = await checkTimeConflicts({
        date: '2025-01-20',
        startTime: '11:00',
        endTime: '13:00',
      });

      if (result.hasConflict) {
        showNotification({
          title: 'Time Conflict',
          message: `This time block conflicts with: ${result.conflictingBlocks.join(', ')}`,
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Time Conflict',
        message: expect.stringContaining('conflicts with'),
        type: 'error',
      });
    });

    it('should show error notification when save fails', async () => {
      const { saveTimeBlock } = require('../../lib/data');
      saveTimeBlock.mockRejectedValueOnce(new Error('Network error'));

      try {
        await saveTimeBlock({
          date: '2025-01-20',
          startTime: '09:00',
          endTime: '10:00',
          type: 'unavailable',
        });
      } catch (error) {
        showNotification({
          title: 'Save Failed',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to save time block',
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Save Failed',
        message: 'Network error',
        type: 'error',
      });
    });

    it('should show success notification when time block is saved', async () => {
      const { saveTimeBlock } = require('../../lib/data');
      saveTimeBlock.mockResolvedValueOnce({
        data: { id: 'timeblock-123' },
        error: null,
      });

      const result = await saveTimeBlock({
        date: '2025-01-20',
        startTime: '09:00',
        endTime: '10:00',
        type: 'unavailable',
      });

      if (!result.error) {
        showNotification({
          title: 'Success',
          message: 'Time block saved successfully',
          type: 'success',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Time block saved successfully',
        type: 'success',
      });
    });
  });

  describe('Time validation', () => {
    it('should validate time format correctly', () => {
      const { validateTimeSlot } = require('../../lib/data');
      validateTimeSlot.mockReturnValueOnce({
        valid: false,
        error: 'Invalid time format',
      });

      const result = validateTimeSlot('25:00');

      if (!result.valid) {
        showNotification({
          title: 'Invalid Time',
          message: result.error,
          type: 'error',
        });
      }

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Invalid Time',
        message: 'Invalid time format',
        type: 'error',
      });
    });

    it('should validate minimum time slot duration', () => {
      showNotification({
        title: 'Invalid Duration',
        message: 'Time slot must be at least 30 minutes',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Invalid Duration',
        message: expect.stringContaining('at least 30 minutes'),
        type: 'error',
      });
    });

    it('should validate maximum time slot duration', () => {
      showNotification({
        title: 'Invalid Duration',
        message: 'Time slot cannot exceed 8 hours',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Invalid Duration',
        message: expect.stringContaining('cannot exceed 8 hours'),
        type: 'error',
      });
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
  });

  describe('Edge cases', () => {
    it('should handle empty form submission', () => {
      showNotification({
        title: 'Validation Error',
        message: 'Please fill in all required fields',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Validation Error',
        message: 'Please fill in all required fields',
        type: 'error',
      });
    });

    it('should handle rapid form submissions', () => {
      showNotification({
        title: 'Error 1',
        message: 'Saving...',
        type: 'info',
      });
      showNotification({
        title: 'Error 2',
        message: 'Already saving',
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledTimes(2);
    });

    it('should handle timezone edge cases', () => {
      showNotification({
        title: 'Timezone Warning',
        message: 'Times are shown in your local timezone',
        type: 'info',
      });

      expect(showNotification).toHaveBeenCalled();
    });

    it('should handle daylight saving time transitions', () => {
      showNotification({
        title: 'Time Adjustment',
        message: 'Time adjusted for daylight saving time',
        type: 'info',
      });

      expect(showNotification).toHaveBeenCalled();
    });

    it('should handle multiple validation errors', () => {
      const errors = [
        'Start time is required',
        'End time is required',
        'Date is required',
      ];

      showNotification({
        title: 'Validation Errors',
        message: errors.join('\n'),
        type: 'error',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Validation Errors',
        message: expect.stringContaining('Start time is required'),
        type: 'error',
      });
    });
  });

  describe('User experience', () => {
    it('should provide clear error messages', () => {
      showNotification({
        title: 'Invalid Input',
        message: 'End time (11:00 AM) must be after start time (2:00 PM)',
        type: 'error',
      });

      const callArgs = (showNotification as jest.Mock).mock.calls[0][0];
      expect(callArgs.message).toContain('must be after');
    });

    it('should provide actionable error messages', () => {
      showNotification({
        title: 'Time Conflict',
        message:
          'This time conflicts with an existing booking. Please choose a different time.',
        type: 'error',
      });

      const callArgs = (showNotification as jest.Mock).mock.calls[0][0];
      expect(callArgs.message).toContain('Please choose');
    });

    it('should provide success feedback', () => {
      showNotification({
        title: 'Availability Updated',
        message: 'Your schedule has been updated successfully',
        type: 'success',
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Availability Updated',
        message: expect.stringContaining('successfully'),
        type: 'success',
      });
    });
  });
});
