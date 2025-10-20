import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AdminFeedback from '../feedback';
import {
  getAdminFeedbackReviews,
  markAdminFeedbackReviewed,
  getPendingAdminFeedbackCount,
} from '../../../lib/data';
import { useAuth } from '../../../lib/auth';
import Toast from 'react-native-toast-message';

// Mock dependencies
jest.mock('../../../lib/data');
jest.mock('../../../lib/auth');
jest.mock('react-native-toast-message');

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockReviews = [
  {
    id: 'review-001',
    booking_id: 'booking-123',
    customer_id: 'customer-456',
    technician_id: 'tech-789',
    rating: 2,
    comment: 'The service was late and the technician was unprofessional',
    admin_feedback: true,
    admin_reviewed: false,
    created_at: '2025-10-15T10:00:00Z',
  },
  {
    id: 'review-002',
    booking_id: 'booking-124',
    customer_id: 'customer-457',
    technician_id: 'tech-790',
    rating: 1,
    comment: 'Terrible experience, lawn was damaged',
    admin_feedback: true,
    admin_reviewed: false,
    created_at: '2025-10-14T14:30:00Z',
  },
];

const mockReviewedReviews = [
  {
    id: 'review-003',
    booking_id: 'booking-125',
    customer_id: 'customer-458',
    technician_id: 'tech-791',
    rating: 3,
    comment: 'Average service, could be better',
    admin_feedback: true,
    admin_reviewed: true,
    admin_reviewed_at: '2025-10-16T09:00:00Z',
    admin_reviewed_by: 'admin-001',
    admin_notes: 'Contacted customer, issued partial refund',
    created_at: '2025-10-13T11:00:00Z',
  },
];

describe('AdminFeedback', () => {
  const mockUser = { id: 'admin-001', email: 'admin@test.com', role: 'admin' };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (getAdminFeedbackReviews as jest.Mock).mockResolvedValue(mockReviews);
    (getPendingAdminFeedbackCount as jest.Mock).mockResolvedValue(2);
    (markAdminFeedbackReviewed as jest.Mock).mockResolvedValue(undefined);
  });

  it('renders the screen with title', async () => {
    const { getByText } = render(<AdminFeedback />);

    await waitFor(() => {
      expect(getByText('Customer Feedback')).toBeTruthy();
      expect(getByText('Reviews requiring admin attention')).toBeTruthy();
    });
  });

  it('displays pending feedback count', async () => {
    const { getByText } = render(<AdminFeedback />);

    await waitFor(() => {
      expect(getByText('2')).toBeTruthy();
      expect(getByText('Pending Reviews')).toBeTruthy();
    });
  });

  it('loads and displays pending feedback reviews', async () => {
    const { getByText } = render(<AdminFeedback />);

    await waitFor(() => {
      expect(getAdminFeedbackReviews).toHaveBeenCalledWith(false);
      expect(
        getByText('The service was late and the technician was unprofessional')
      ).toBeTruthy();
      expect(getByText('Terrible experience, lawn was damaged')).toBeTruthy();
    });
  });

  it('displays rating stars correctly', async () => {
    const { getAllByTestId } = render(<AdminFeedback />);

    await waitFor(() => {
      const starGroups = getAllByTestId(/star-group/);
      expect(starGroups.length).toBeGreaterThan(0);
    });
  });

  it('shows loading state initially', () => {
    const { getByText } = render(<AdminFeedback />);
    expect(getByText('Loading feedback...')).toBeTruthy();
  });

  it('toggles to show reviewed feedback', async () => {
    (getAdminFeedbackReviews as jest.Mock)
      .mockResolvedValueOnce(mockReviews)
      .mockResolvedValueOnce(mockReviewedReviews);

    const { getByText } = render(<AdminFeedback />);

    await waitFor(() => {
      expect(getByText('Pending')).toBeTruthy();
    });

    const toggleButton = getByText('Pending');
    fireEvent.press(toggleButton);

    await waitFor(() => {
      expect(getByText('Reviewed')).toBeTruthy();
      expect(getAdminFeedbackReviews).toHaveBeenCalledWith(true);
      expect(
        getByText('Contacted customer, issued partial refund')
      ).toBeTruthy();
    });
  });

  it('expands review card on tap', async () => {
    const { getByText } = render(<AdminFeedback />);

    await waitFor(() => {
      expect(getByText('Tap to expand')).toBeTruthy();
    });

    // Tap on the first review card
    const reviewCard = getByText(
      'The service was late and the technician was unprofessional'
    );
    fireEvent.press(reviewCard.parent!);

    await waitFor(() => {
      expect(getByText('Booking Details:')).toBeTruthy();
      expect(getByText('Mark as Reviewed')).toBeTruthy();
    });
  });

  it('allows admin to enter notes', async () => {
    const { getByText, getByPlaceholderText } = render(<AdminFeedback />);

    await waitFor(() => {
      const reviewCard = getByText(
        'The service was late and the technician was unprofessional'
      );
      fireEvent.press(reviewCard.parent!);
    });

    await waitFor(() => {
      const notesInput = getByPlaceholderText(
        /Enter notes about actions taken or follow-up needed/
      );
      fireEvent.changeText(
        notesInput,
        'Contacted customer and provided compensation'
      );

      expect(notesInput.props.value).toBe(
        'Contacted customer and provided compensation'
      );
    });
  });

  it('marks feedback as reviewed with confirmation', async () => {
    (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
      // Simulate user pressing "Confirm"
      buttons![1].onPress();
    });

    const { getByText, getByPlaceholderText } = render(<AdminFeedback />);

    await waitFor(() => {
      const reviewCard = getByText(
        'The service was late and the technician was unprofessional'
      );
      fireEvent.press(reviewCard.parent!);
    });

    await waitFor(() => {
      const notesInput = getByPlaceholderText(
        /Enter notes about actions taken or follow-up needed/
      );
      fireEvent.changeText(notesInput, 'Issue resolved');
    });

    const markReviewedButton = getByText('Mark as Reviewed');
    fireEvent.press(markReviewedButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Mark as Reviewed',
        'Are you sure you want to mark this feedback as reviewed?',
        expect.any(Array)
      );
      expect(markAdminFeedbackReviewed).toHaveBeenCalledWith(
        'review-001',
        'admin-001',
        'Issue resolved'
      );
      expect(Toast.show).toHaveBeenCalledWith({
        type: 'success',
        text1: 'Success',
        text2: 'Feedback marked as reviewed',
      });
    });
  });

  it('cancels marking as reviewed when user cancels confirmation', async () => {
    (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
      // Simulate user pressing "Cancel"
      buttons![0].onPress?.();
    });

    const { getByText } = render(<AdminFeedback />);

    await waitFor(() => {
      const reviewCard = getByText(
        'The service was late and the technician was unprofessional'
      );
      fireEvent.press(reviewCard.parent!);
    });

    const markReviewedButton = getByText('Mark as Reviewed');
    fireEvent.press(markReviewedButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
      expect(markAdminFeedbackReviewed).not.toHaveBeenCalled();
    });
  });

  it('handles error when marking as reviewed fails', async () => {
    (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
      buttons![1].onPress();
    });
    (markAdminFeedbackReviewed as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    const { getByText } = render(<AdminFeedback />);

    await waitFor(() => {
      const reviewCard = getByText(
        'The service was late and the technician was unprofessional'
      );
      fireEvent.press(reviewCard.parent!);
    });

    const markReviewedButton = getByText('Mark as Reviewed');
    fireEvent.press(markReviewedButton);

    await waitFor(() => {
      expect(Toast.show).toHaveBeenCalledWith({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to mark feedback as reviewed',
      });
    });
  });

  it('handles pull-to-refresh', async () => {
    const { getByTestId } = render(<AdminFeedback />);

    await waitFor(() => {
      expect(getAdminFeedbackReviews).toHaveBeenCalledTimes(1);
    });

    const scrollView = getByTestId('feedback-scroll-view');
    fireEvent(scrollView, 'refresh');

    await waitFor(() => {
      expect(getAdminFeedbackReviews).toHaveBeenCalledTimes(2);
      expect(getPendingAdminFeedbackCount).toHaveBeenCalledTimes(2);
    });
  });

  it('shows empty state when no pending feedback', async () => {
    (getAdminFeedbackReviews as jest.Mock).mockResolvedValue([]);
    (getPendingAdminFeedbackCount as jest.Mock).mockResolvedValue(0);

    const { getByText } = render(<AdminFeedback />);

    await waitFor(() => {
      expect(getByText('No Feedback Found')).toBeTruthy();
      expect(
        getByText('No pending feedback reviews at this time')
      ).toBeTruthy();
    });
  });

  it('shows different empty state for reviewed feedback', async () => {
    (getAdminFeedbackReviews as jest.Mock)
      .mockResolvedValueOnce(mockReviews)
      .mockResolvedValueOnce([]);

    const { getByText } = render(<AdminFeedback />);

    await waitFor(() => {
      const toggleButton = getByText('Pending');
      fireEvent.press(toggleButton);
    });

    await waitFor(() => {
      expect(getByText('No Feedback Found')).toBeTruthy();
      expect(getByText('No reviewed feedback to display')).toBeTruthy();
    });
  });

  it('handles error loading feedback', async () => {
    (getAdminFeedbackReviews as jest.Mock).mockRejectedValue(
      new Error('Failed to fetch')
    );

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    render(<AdminFeedback />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error loading feedback:',
        expect.any(Error)
      );
      expect(Toast.show).toHaveBeenCalledWith({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load feedback reviews',
      });
    });

    consoleErrorSpy.mockRestore();
  });

  it('shows error when user not authenticated', async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null });

    const { getByText } = render(<AdminFeedback />);

    await waitFor(() => {
      const reviewCard = getByText(
        'The service was late and the technician was unprofessional'
      );
      fireEvent.press(reviewCard.parent!);
    });

    const markReviewedButton = getByText('Mark as Reviewed');
    fireEvent.press(markReviewedButton);

    await waitFor(() => {
      expect(Toast.show).toHaveBeenCalledWith({
        type: 'error',
        text1: 'Error',
        text2: 'User not authenticated',
      });
      expect(markAdminFeedbackReviewed).not.toHaveBeenCalled();
    });
  });

  it('removes review from list after marking as reviewed', async () => {
    (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
      buttons![1].onPress();
    });

    const { getByText, queryByText } = render(<AdminFeedback />);

    await waitFor(() => {
      expect(
        getByText('The service was late and the technician was unprofessional')
      ).toBeTruthy();
    });

    const reviewCard = getByText(
      'The service was late and the technician was unprofessional'
    );
    fireEvent.press(reviewCard.parent!);

    await waitFor(() => {
      const markReviewedButton = getByText('Mark as Reviewed');
      fireEvent.press(markReviewedButton);
    });

    await waitFor(() => {
      expect(
        queryByText(
          'The service was late and the technician was unprofessional'
        )
      ).toBeNull();
    });
  });

  it('updates pending count after marking as reviewed', async () => {
    (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
      buttons![1].onPress();
    });

    const { getByText } = render(<AdminFeedback />);

    await waitFor(() => {
      expect(getByText('2')).toBeTruthy();
    });

    const reviewCard = getByText(
      'The service was late and the technician was unprofessional'
    );
    fireEvent.press(reviewCard.parent!);

    await waitFor(() => {
      const markReviewedButton = getByText('Mark as Reviewed');
      fireEvent.press(markReviewedButton);
    });

    await waitFor(() => {
      expect(getByText('1')).toBeTruthy(); // Count decreased
    });
  });

  it('formats dates correctly', async () => {
    const { getByText } = render(<AdminFeedback />);

    await waitFor(() => {
      // Check for formatted date (Oct 15, 2025, etc.)
      expect(getByText(/Submitted/)).toBeTruthy();
    });
  });

  it('displays booking and technician IDs', async () => {
    const { getByText } = render(<AdminFeedback />);

    await waitFor(() => {
      const reviewCard = getByText(
        'The service was late and the technician was unprofessional'
      );
      fireEvent.press(reviewCard.parent!);
    });

    await waitFor(() => {
      expect(getByText(/Booking ID:/)).toBeTruthy();
      expect(getByText(/Technician ID:/)).toBeTruthy();
    });
  });
});
