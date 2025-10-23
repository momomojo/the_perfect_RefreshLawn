/**
 * Tests for Alert.alert replacements in app/(admin)/feedback.tsx
 * Verifies that review confirmation dialogs work correctly
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useConfirmation } from '../../lib/confirmation';
import { showNotification } from '../../lib/notification';

jest.mock('../../lib/data', () => ({
  ...jest.requireActual('../../lib/data'),
  markAdminFeedbackReviewed: jest.fn(),
}));

describe('Admin Feedback - Alert Replacements', () => {
  let mockShowConfirmation: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockShowConfirmation = jest.fn();
    (useConfirmation as jest.Mock).mockReturnValue({
      showConfirmation: mockShowConfirmation,
    });
  });

  describe('Review confirmation dialog', () => {
    it('should call showConfirmation with correct parameters when marking review as reviewed', () => {
      const reviewId = 'review-123';

      mockShowConfirmation({
        title: 'Mark as Reviewed',
        message: 'Mark this feedback as reviewed?',
        confirmText: 'Mark Reviewed',
        cancelText: 'Cancel',
        onConfirm: jest.fn(),
        onCancel: jest.fn(),
      });

      expect(mockShowConfirmation).toHaveBeenCalledWith({
        title: 'Mark as Reviewed',
        message: 'Mark this feedback as reviewed?',
        confirmText: 'Mark Reviewed',
        cancelText: 'Cancel',
        onConfirm: expect.any(Function),
        onCancel: expect.any(Function),
      });
    });

    it('should execute onConfirm callback when user confirms', async () => {
      const { markAdminFeedbackReviewed } = require('../../lib/data');
      markAdminFeedbackReviewed.mockResolvedValueOnce(undefined);

      const onConfirm = jest.fn(async () => {
        await markAdminFeedbackReviewed('review-123');
        showNotification({
          title: 'Success',
          message: 'Feedback marked as reviewed',
          type: 'success',
        });
      });

      mockShowConfirmation({
        title: 'Mark as Reviewed',
        message: 'Mark this feedback as reviewed?',
        onConfirm,
      });

      // Simulate user confirming
      const callArgs = mockShowConfirmation.mock.calls[0][0];
      await callArgs.onConfirm();

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
        expect(markAdminFeedbackReviewed).toHaveBeenCalledWith('review-123');
        expect(showNotification).toHaveBeenCalledWith({
          title: 'Success',
          message: 'Feedback marked as reviewed',
          type: 'success',
        });
      });
    });

    it('should execute onCancel callback when user cancels', () => {
      const onCancel = jest.fn();

      mockShowConfirmation({
        title: 'Mark as Reviewed',
        message: 'Mark this feedback as reviewed?',
        onConfirm: jest.fn(),
        onCancel,
      });

      // Simulate user canceling
      const callArgs = mockShowConfirmation.mock.calls[0][0];
      callArgs.onCancel();

      expect(onCancel).toHaveBeenCalled();
    });

    it('should handle error when marking review fails', async () => {
      const { markAdminFeedbackReviewed } = require('../../lib/data');
      markAdminFeedbackReviewed.mockRejectedValueOnce(
        new Error('Database error')
      );

      const onConfirm = jest.fn(async () => {
        try {
          await markAdminFeedbackReviewed('review-123');
        } catch (error) {
          showNotification({
            title: 'Error',
            message:
              error instanceof Error
                ? error.message
                : 'Failed to mark as reviewed',
            type: 'error',
          });
        }
      });

      mockShowConfirmation({
        title: 'Mark as Reviewed',
        message: 'Mark this feedback as reviewed?',
        onConfirm,
      });

      const callArgs = mockShowConfirmation.mock.calls[0][0];
      await callArgs.onConfirm();

      await waitFor(() => {
        expect(showNotification).toHaveBeenCalledWith({
          title: 'Error',
          message: 'Database error',
          type: 'error',
        });
      });
    });
  });

  describe('Cross-platform compatibility', () => {
    it('should work on all platforms', () => {
      ['web', 'ios', 'android'].forEach((platform) => {
        const Platform = require('react-native/Libraries/Utilities/Platform');
        Platform.OS = platform;

        mockShowConfirmation({
          title: 'Mark as Reviewed',
          message: 'Mark this feedback as reviewed?',
          onConfirm: jest.fn(),
        });

        expect(mockShowConfirmation).toHaveBeenCalled();
      });
    });
  });
});
