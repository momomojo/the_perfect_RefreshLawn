import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ReviewPromptModal from '../ReviewPromptModal';
import type { Booking } from '../../../../lib/data';

// Mock booking data
const mockBooking: Booking = {
  id: 'booking-123',
  customer_id: 'customer-456',
  technician_id: 'tech-789',
  service_id: 'service-001',
  status: 'completed',
  scheduled_date: '2025-10-15T10:00:00Z',
  address: '123 Main St',
  created_at: '2025-10-10T08:00:00Z',
  service: {
    id: 'service-001',
    name: 'Lawn Mowing',
    description: 'Professional lawn mowing service',
    price: 50.0,
    duration_minutes: 60,
  },
};

describe('ReviewPromptModal', () => {
  const mockOnRatingSubmit = jest.fn().mockResolvedValue(undefined);
  const mockOnClose = jest.fn();
  const mockOnRateLater = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when visible is true', () => {
    const { getByText } = render(
      <ReviewPromptModal
        visible={true}
        booking={mockBooking}
        onRatingSubmit={mockOnRatingSubmit}
        onClose={mockOnClose}
        onRateLater={mockOnRateLater}
      />
    );

    expect(getByText('Rate Your Service')).toBeTruthy();
    expect(getByText('Lawn Mowing')).toBeTruthy();
  });

  it('does not render when visible is false', () => {
    const { queryByText } = render(
      <ReviewPromptModal
        visible={false}
        booking={mockBooking}
        onRatingSubmit={mockOnRatingSubmit}
        onClose={mockOnClose}
        onRateLater={mockOnRateLater}
      />
    );

    expect(queryByText('Rate Your Service')).toBeNull();
  });

  it('displays booking details correctly', () => {
    const { getByText } = render(
      <ReviewPromptModal
        visible={true}
        booking={mockBooking}
        onRatingSubmit={mockOnRatingSubmit}
        onClose={mockOnClose}
        onRateLater={mockOnRateLater}
      />
    );

    expect(getByText('Lawn Mowing')).toBeTruthy();
    expect(getByText('123 Main St')).toBeTruthy();
  });

  it('allows user to select rating by tapping stars', () => {
    const { getAllByTestId, getByText } = render(
      <ReviewPromptModal
        visible={true}
        booking={mockBooking}
        onRatingSubmit={mockOnRatingSubmit}
        onClose={mockOnClose}
        onRateLater={mockOnRateLater}
      />
    );

    // Initially submit button should be disabled (no rating selected)
    const submitButton = getByText('Submit Rating');
    expect(submitButton.parent?.props.className).toContain('bg-gray-300');

    // Tap on the 4th star
    const stars = getAllByTestId(/star-button-/);
    fireEvent.press(stars[3]);

    // Submit button should now be enabled
    waitFor(() => {
      expect(submitButton.parent?.props.className).toContain('bg-green-600');
    });
  });

  it('calls onRatingSubmit with correct rating when submitted', async () => {
    const { getAllByTestId, getByText } = render(
      <ReviewPromptModal
        visible={true}
        booking={mockBooking}
        onRatingSubmit={mockOnRatingSubmit}
        onClose={mockOnClose}
        onRateLater={mockOnRateLater}
      />
    );

    // Select 5 stars
    const stars = getAllByTestId(/star-button-/);
    fireEvent.press(stars[4]);

    // Submit rating
    const submitButton = getByText('Submit Rating');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockOnRatingSubmit).toHaveBeenCalledWith(5);
    });
  });

  it('prevents submission when no rating is selected', () => {
    const { getByText } = render(
      <ReviewPromptModal
        visible={true}
        booking={mockBooking}
        onRatingSubmit={mockOnRatingSubmit}
        onClose={mockOnClose}
        onRateLater={mockOnRateLater}
      />
    );

    const submitButton = getByText('Submit Rating');
    fireEvent.press(submitButton);

    // Should not call onRatingSubmit
    expect(mockOnRatingSubmit).not.toHaveBeenCalled();
  });

  it('calls onRateLater when Rate Later is pressed', () => {
    const { getByText } = render(
      <ReviewPromptModal
        visible={true}
        booking={mockBooking}
        onRatingSubmit={mockOnRatingSubmit}
        onClose={mockOnClose}
        onRateLater={mockOnRateLater}
      />
    );

    const rateLaterButton = getByText('Rate Later');
    fireEvent.press(rateLaterButton);

    expect(mockOnRateLater).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled(); // Also closes modal
  });

  it('calls onClose when close button (X) is pressed', () => {
    const { getAllByLabelText } = render(
      <ReviewPromptModal
        visible={true}
        booking={mockBooking}
        onRatingSubmit={mockOnRatingSubmit}
        onClose={mockOnClose}
        onRateLater={mockOnRateLater}
      />
    );

    // Find and press close button
    const closeButton = getAllByLabelText('Close')[0];
    fireEvent.press(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows loading state while submitting', async () => {
    const slowSubmit = jest.fn(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const { getAllByTestId, getByText, queryByText } = render(
      <ReviewPromptModal
        visible={true}
        booking={mockBooking}
        onRatingSubmit={slowSubmit}
        onClose={mockOnClose}
      />
    );

    // Select rating
    const stars = getAllByTestId(/star-button-/);
    fireEvent.press(stars[4]);

    // Submit
    const submitButton = getByText('Submit Rating');
    fireEvent.press(submitButton);

    // Should show loading indicator
    await waitFor(() => {
      expect(queryByText('Submit Rating')).toBeNull();
    });
  });

  it('resets rating after successful submission', async () => {
    const { getAllByTestId, getByText, rerender } = render(
      <ReviewPromptModal
        visible={true}
        booking={mockBooking}
        onRatingSubmit={mockOnRatingSubmit}
        onClose={mockOnClose}
        onRateLater={mockOnRateLater}
      />
    );

    // Select and submit rating
    const stars = getAllByTestId(/star-button-/);
    fireEvent.press(stars[4]);

    const submitButton = getByText('Submit Rating');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockOnRatingSubmit).toHaveBeenCalledWith(5);
    });

    // Re-render modal (as if it closed and reopened)
    rerender(
      <ReviewPromptModal
        visible={false}
        booking={mockBooking}
        onRatingSubmit={mockOnRatingSubmit}
        onClose={mockOnClose}
        onRateLater={mockOnRateLater}
      />
    );

    rerender(
      <ReviewPromptModal
        visible={true}
        booking={mockBooking}
        onRatingSubmit={mockOnRatingSubmit}
        onClose={mockOnClose}
        onRateLater={mockOnRateLater}
      />
    );

    // Rating should be reset
    const newSubmitButton = getByText('Submit Rating');
    expect(newSubmitButton.parent?.props.className).toContain('bg-gray-300');
  });

  it('displays correct date format', () => {
    const { getByText } = render(
      <ReviewPromptModal
        visible={true}
        booking={mockBooking}
        onRatingSubmit={mockOnRatingSubmit}
        onClose={mockOnClose}
        onRateLater={mockOnRateLater}
      />
    );

    // Should display formatted date (Oct 15, 2025)
    expect(getByText(/Oct 15, 2025/)).toBeTruthy();
  });
});
