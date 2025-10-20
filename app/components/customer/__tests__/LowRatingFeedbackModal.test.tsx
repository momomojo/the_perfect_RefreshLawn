import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LowRatingFeedbackModal from '../LowRatingFeedbackModal';

describe('LowRatingFeedbackModal', () => {
  const mockOnSubmitFeedback = jest.fn().mockResolvedValue(undefined);
  const mockOnSkip = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when visible is true', () => {
    const { getByText } = render(
      <LowRatingFeedbackModal
        visible={true}
        rating={2}
        onClose={mockOnClose}
        onSubmitFeedback={mockOnSubmitFeedback}
        onSkip={mockOnSkip}
      />
    );

    expect(getByText('Help Us Improve')).toBeTruthy();
    expect(
      getByText(
        "We're sorry your experience wasn't perfect. Your feedback helps us serve you better."
      )
    ).toBeTruthy();
  });

  it('does not render when visible is false', () => {
    const { queryByText } = render(
      <LowRatingFeedbackModal
        visible={false}
        rating={2}
        onClose={mockOnClose}
        onSubmitFeedback={mockOnSubmitFeedback}
        onSkip={mockOnSkip}
      />
    );

    expect(queryByText('Help Us Improve')).toBeNull();
  });

  it('allows user to enter feedback text', () => {
    const { getByPlaceholderText } = render(
      <LowRatingFeedbackModal
        visible={true}
        rating={2}
        onClose={mockOnClose}
        onSubmitFeedback={mockOnSubmitFeedback}
        onSkip={mockOnSkip}
      />
    );

    const textInput = getByPlaceholderText(
      /Please share specific details about your experience/
    );
    fireEvent.changeText(textInput, 'The service was late and incomplete');

    expect(textInput.props.value).toBe('The service was late and incomplete');
  });

  it('shows character count as user types', () => {
    const { getByPlaceholderText, getByText } = render(
      <LowRatingFeedbackModal
        visible={true}
        rating={2}
        onClose={mockOnClose}
        onSubmitFeedback={mockOnSubmitFeedback}
        onSkip={mockOnSkip}
      />
    );

    const textInput = getByPlaceholderText(
      /Please share specific details about your experience/
    );
    fireEvent.changeText(textInput, 'Short feedback');

    expect(getByText('14/500 characters')).toBeTruthy();
  });

  it('enforces minimum 20 character requirement', () => {
    const { getByPlaceholderText, getByText } = render(
      <LowRatingFeedbackModal
        visible={true}
        rating={2}
        onClose={mockOnClose}
        onSubmitFeedback={mockOnSubmitFeedback}
        onSkip={mockOnSkip}
      />
    );

    const textInput = getByPlaceholderText(
      /Please share specific details about your experience/
    );
    const submitButton = getByText('Submit Feedback');

    // Short feedback (less than 20 characters)
    fireEvent.changeText(textInput, 'Too short');
    fireEvent.press(submitButton);

    // Should show error
    expect(
      getByText('Please provide at least 20 characters of feedback')
    ).toBeTruthy();
    expect(mockOnSubmitFeedback).not.toHaveBeenCalled();
  });

  it('shows ready indicator when minimum characters reached', () => {
    const { getByPlaceholderText, getByText } = render(
      <LowRatingFeedbackModal
        visible={true}
        rating={2}
        onClose={mockOnClose}
        onSubmitFeedback={mockOnSubmitFeedback}
        onSkip={mockOnSkip}
      />
    );

    const textInput = getByPlaceholderText(
      /Please share specific details about your experience/
    );

    // Less than 20 characters
    fireEvent.changeText(textInput, 'Short');
    expect(getByText('15 more')).toBeTruthy();

    // 20 or more characters
    fireEvent.changeText(textInput, 'This feedback is long enough to submit');
    expect(getByText('✓ Ready')).toBeTruthy();
  });

  it('calls onSubmitFeedback with trimmed feedback when submitted', async () => {
    const { getByPlaceholderText, getByText } = render(
      <LowRatingFeedbackModal
        visible={true}
        rating={3}
        onClose={mockOnClose}
        onSubmitFeedback={mockOnSubmitFeedback}
        onSkip={mockOnSkip}
      />
    );

    const textInput = getByPlaceholderText(
      /Please share specific details about your experience/
    );
    const submitButton = getByText('Submit Feedback');

    // Enter valid feedback with whitespace
    fireEvent.changeText(
      textInput,
      '  The technician was unprofessional and left a mess  '
    );
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockOnSubmitFeedback).toHaveBeenCalledWith(
        'The technician was unprofessional and left a mess'
      );
    });
  });

  it('disables submit button when feedback is too short', () => {
    const { getByPlaceholderText, getByText } = render(
      <LowRatingFeedbackModal
        visible={true}
        rating={1}
        onClose={mockOnClose}
        onSubmitFeedback={mockOnSubmitFeedback}
        onSkip={mockOnSkip}
      />
    );

    const textInput = getByPlaceholderText(
      /Please share specific details about your experience/
    );
    const submitButton = getByText('Submit Feedback');

    fireEvent.changeText(textInput, 'Short');

    // Submit button should be disabled (gray background)
    expect(submitButton.parent?.props.className).toContain('bg-gray-300');
    expect(submitButton.parent?.props.disabled).toBe(true);
  });

  it('enables submit button when feedback meets minimum length', () => {
    const { getByPlaceholderText, getByText } = render(
      <LowRatingFeedbackModal
        visible={true}
        rating={2}
        onClose={mockOnClose}
        onSubmitFeedback={mockOnSubmitFeedback}
        onSkip={mockOnSkip}
      />
    );

    const textInput = getByPlaceholderText(
      /Please share specific details about your experience/
    );
    const submitButton = getByText('Submit Feedback');

    fireEvent.changeText(
      textInput,
      'This is long enough feedback for submission'
    );

    // Submit button should be enabled (orange background)
    expect(submitButton.parent?.props.className).toContain('bg-orange-600');
    expect(submitButton.parent?.props.disabled).toBe(false);
  });

  it('calls onSkip when Skip for Now is pressed', () => {
    const { getByText } = render(
      <LowRatingFeedbackModal
        visible={true}
        rating={2}
        onClose={mockOnClose}
        onSubmitFeedback={mockOnSubmitFeedback}
        onSkip={mockOnSkip}
      />
    );

    const skipButton = getByText('Skip for Now');
    fireEvent.press(skipButton);

    expect(mockOnSkip).toHaveBeenCalled();
  });

  it('calls onClose when close button (X) is pressed', () => {
    const { getAllByLabelText } = render(
      <LowRatingFeedbackModal
        visible={true}
        rating={2}
        onClose={mockOnClose}
        onSubmitFeedback={mockOnSubmitFeedback}
        onSkip={mockOnSkip}
      />
    );

    const closeButton = getAllByLabelText('Close')[0];
    fireEvent.press(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows loading state while submitting', async () => {
    const slowSubmit = jest.fn(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const { getByPlaceholderText, getByText, queryByText } = render(
      <LowRatingFeedbackModal
        visible={true}
        rating={2}
        onClose={mockOnClose}
        onSubmitFeedback={slowSubmit}
        onSkip={mockOnSkip}
      />
    );

    const textInput = getByPlaceholderText(
      /Please share specific details about your experience/
    );
    fireEvent.changeText(textInput, 'Valid feedback that is long enough');

    const submitButton = getByText('Submit Feedback');
    fireEvent.press(submitButton);

    // Should show loading indicator
    await waitFor(() => {
      expect(queryByText('Submit Feedback')).toBeNull();
    });
  });

  it('clears feedback and error on successful submission', async () => {
    const { getByPlaceholderText, getByText, rerender } = render(
      <LowRatingFeedbackModal
        visible={true}
        rating={2}
        onClose={mockOnClose}
        onSubmitFeedback={mockOnSubmitFeedback}
        onSkip={mockOnSkip}
      />
    );

    const textInput = getByPlaceholderText(
      /Please share specific details about your experience/
    );
    fireEvent.changeText(textInput, 'Valid feedback that is long enough');

    const submitButton = getByText('Submit Feedback');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockOnSubmitFeedback).toHaveBeenCalled();
    });

    // Re-render to simulate modal reopening
    rerender(
      <LowRatingFeedbackModal
        visible={false}
        rating={2}
        onClose={mockOnClose}
        onSubmitFeedback={mockOnSubmitFeedback}
        onSkip={mockOnSkip}
      />
    );

    rerender(
      <LowRatingFeedbackModal
        visible={true}
        rating={2}
        onClose={mockOnClose}
        onSubmitFeedback={mockOnSubmitFeedback}
        onSkip={mockOnSkip}
      />
    );

    // Feedback should be cleared
    const newTextInput = getByPlaceholderText(
      /Please share specific details about your experience/
    );
    expect(newTextInput.props.value).toBe('');
  });

  it('enforces maximum character limit of 500', () => {
    const { getByPlaceholderText } = render(
      <LowRatingFeedbackModal
        visible={true}
        rating={2}
        onClose={mockOnClose}
        onSubmitFeedback={mockOnSubmitFeedback}
        onSkip={mockOnSkip}
      />
    );

    const textInput = getByPlaceholderText(
      /Please share specific details about your experience/
    );

    // TextInput component should have maxLength prop
    expect(textInput.props.maxLength).toBe(500);
  });

  it('clears error when user types after error', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <LowRatingFeedbackModal
        visible={true}
        rating={2}
        onClose={mockOnClose}
        onSubmitFeedback={mockOnSubmitFeedback}
        onSkip={mockOnSkip}
      />
    );

    const textInput = getByPlaceholderText(
      /Please share specific details about your experience/
    );
    const submitButton = getByText('Submit Feedback');

    // Trigger error
    fireEvent.changeText(textInput, 'Short');
    fireEvent.press(submitButton);

    expect(
      getByText('Please provide at least 20 characters of feedback')
    ).toBeTruthy();

    // Type more text
    fireEvent.changeText(textInput, 'Short feedback now longer');

    // Error should be cleared
    expect(
      queryByText('Please provide at least 20 characters of feedback')
    ).toBeNull();
  });
});
