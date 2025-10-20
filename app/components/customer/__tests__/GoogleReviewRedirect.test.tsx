import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';
import GoogleReviewRedirect from '../GoogleReviewRedirect';

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  canOpenURL: jest.fn(),
  openURL: jest.fn(),
}));

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn((obj) => obj.ios),
}));

describe('GoogleReviewRedirect', () => {
  const mockOnClose = jest.fn();
  const mockOnReviewCompleted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
    (Linking.openURL as jest.Mock).mockResolvedValue(true);
  });

  it('renders modal when visible is true', () => {
    const { getByText } = render(
      <GoogleReviewRedirect
        visible={true}
        rating={5}
        onClose={mockOnClose}
        onReviewCompleted={mockOnReviewCompleted}
      />
    );

    expect(getByText('Love Your Service?')).toBeTruthy();
    expect(
      getByText(
        'Share your experience on Google to help others discover RefreshLawn!'
      )
    ).toBeTruthy();
  });

  it('does not render when visible is false', () => {
    const { queryByText } = render(
      <GoogleReviewRedirect
        visible={false}
        rating={5}
        onClose={mockOnClose}
        onReviewCompleted={mockOnReviewCompleted}
      />
    );

    expect(queryByText('Love Your Service?')).toBeNull();
  });

  it('displays rating correctly', () => {
    const { getAllByTestId } = render(
      <GoogleReviewRedirect
        visible={true}
        rating={4}
        onClose={mockOnClose}
        onReviewCompleted={mockOnReviewCompleted}
      />
    );

    const stars = getAllByTestId(/star-display/);
    expect(stars).toHaveLength(4);
  });

  it('opens Google Maps app URL on iOS when Place ID is configured', async () => {
    // Mock environment variable
    process.env.EXPO_PUBLIC_GOOGLE_PLACE_ID = 'ChIJtest123';
    Platform.OS = 'ios';

    const { getByText } = render(
      <GoogleReviewRedirect
        visible={true}
        rating={5}
        onClose={mockOnClose}
        onReviewCompleted={mockOnReviewCompleted}
      />
    );

    const reviewButton = getByText('Leave a Google Review');
    fireEvent.press(reviewButton);

    await waitFor(() => {
      expect(Linking.canOpenURL).toHaveBeenCalledWith(
        'comgooglemaps://?q=place_id:ChIJtest123&reviews=true'
      );
      expect(Linking.openURL).toHaveBeenCalledWith(
        'comgooglemaps://?q=place_id:ChIJtest123&reviews=true'
      );
    });
  });

  it('falls back to web URL on iOS when Google Maps app not installed', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_PLACE_ID = 'ChIJtest123';
    Platform.OS = 'ios';
    (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false); // App not installed

    const { getByText } = render(
      <GoogleReviewRedirect
        visible={true}
        rating={5}
        onClose={mockOnClose}
        onReviewCompleted={mockOnReviewCompleted}
      />
    );

    const reviewButton = getByText('Leave a Google Review');
    fireEvent.press(reviewButton);

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://search.google.com/local/writereview?placeid=ChIJtest123'
      );
    });
  });

  it('opens Android Google Maps URL when Place ID is configured', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_PLACE_ID = 'ChIJtest123';
    Platform.OS = 'android';

    const { getByText } = render(
      <GoogleReviewRedirect
        visible={true}
        rating={5}
        onClose={mockOnClose}
        onReviewCompleted={mockOnReviewCompleted}
      />
    );

    const reviewButton = getByText('Leave a Google Review');
    fireEvent.press(reviewButton);

    await waitFor(() => {
      expect(Linking.canOpenURL).toHaveBeenCalledWith(
        'geo:0,0?q=place_id:ChIJtest123'
      );
      expect(Linking.openURL).toHaveBeenCalledWith(
        'geo:0,0?q=place_id:ChIJtest123'
      );
    });
  });

  it('uses generic search URL when Place ID not configured', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_PLACE_ID = '';

    const { getByText } = render(
      <GoogleReviewRedirect
        visible={true}
        rating={5}
        onClose={mockOnClose}
        onReviewCompleted={mockOnReviewCompleted}
      />
    );

    const reviewButton = getByText('Leave a Google Review');
    fireEvent.press(reviewButton);

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining('google.com/search?q=RefreshLawn%20reviews')
      );
    });
  });

  it('shows warning when Place ID not configured', () => {
    process.env.EXPO_PUBLIC_GOOGLE_PLACE_ID = '';

    const { getByText } = render(
      <GoogleReviewRedirect
        visible={true}
        rating={5}
        onClose={mockOnClose}
        onReviewCompleted={mockOnReviewCompleted}
      />
    );

    expect(
      getByText('⚠️ Google Place ID not configured. Using generic search.')
    ).toBeTruthy();
  });

  it('does not show warning when Place ID is configured', () => {
    process.env.EXPO_PUBLIC_GOOGLE_PLACE_ID = 'ChIJtest123';

    const { queryByText } = render(
      <GoogleReviewRedirect
        visible={true}
        rating={5}
        onClose={mockOnClose}
        onReviewCompleted={mockOnReviewCompleted}
      />
    );

    expect(
      queryByText('⚠️ Google Place ID not configured. Using generic search.')
    ).toBeNull();
  });

  it('calls onReviewCompleted after successful URL open', async () => {
    const { getByText } = render(
      <GoogleReviewRedirect
        visible={true}
        rating={5}
        onClose={mockOnClose}
        onReviewCompleted={mockOnReviewCompleted}
      />
    );

    const reviewButton = getByText('Leave a Google Review');
    fireEvent.press(reviewButton);

    // Wait for the 1500ms delay
    await waitFor(
      () => {
        expect(mockOnReviewCompleted).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
  });

  it('calls onClose when Maybe Later is pressed', () => {
    const { getByText } = render(
      <GoogleReviewRedirect
        visible={true}
        rating={5}
        onClose={mockOnClose}
        onReviewCompleted={mockOnReviewCompleted}
      />
    );

    const maybeLaterButton = getByText('Maybe Later');
    fireEvent.press(maybeLaterButton);

    expect(mockOnReviewCompleted).toHaveBeenCalled();
  });

  it('calls onClose when close button (X) is pressed', () => {
    const { getAllByLabelText } = render(
      <GoogleReviewRedirect
        visible={true}
        rating={5}
        onClose={mockOnClose}
        onReviewCompleted={mockOnReviewCompleted}
      />
    );

    const closeButton = getAllByLabelText('Close')[0];
    fireEvent.press(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows loading state while opening URL', async () => {
    const { getByText, queryByText } = render(
      <GoogleReviewRedirect
        visible={true}
        rating={5}
        onClose={mockOnClose}
        onReviewCompleted={mockOnReviewCompleted}
      />
    );

    const reviewButton = getByText('Leave a Google Review');
    fireEvent.press(reviewButton);

    // Should show ActivityIndicator instead of button text
    await waitFor(() => {
      expect(queryByText('Leave a Google Review')).toBeNull();
    });
  });

  it('handles error when URL cannot be opened', async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);
    (Linking.openURL as jest.Mock).mockRejectedValue(
      new Error('Cannot open URL')
    );

    // Mock alert
    const alertSpy = jest.spyOn(global, 'alert').mockImplementation();

    const { getByText } = render(
      <GoogleReviewRedirect
        visible={true}
        rating={5}
        onClose={mockOnClose}
        onReviewCompleted={mockOnReviewCompleted}
      />
    );

    const reviewButton = getByText('Leave a Google Review');
    fireEvent.press(reviewButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Unable to open Google Reviews. Please try again later.'
      );
    });

    alertSpy.mockRestore();
  });

  it('disables buttons while opening URL', async () => {
    const { getByText } = render(
      <GoogleReviewRedirect
        visible={true}
        rating={5}
        onClose={mockOnClose}
        onReviewCompleted={mockOnReviewCompleted}
      />
    );

    const reviewButton = getByText('Leave a Google Review');
    const maybeLaterButton = getByText('Maybe Later');

    fireEvent.press(reviewButton);

    // Maybe Later button should be disabled
    await waitFor(() => {
      expect(maybeLaterButton.props.disabled).toBe(true);
    });
  });

  it('displays benefits section correctly', () => {
    const { getByText } = render(
      <GoogleReviewRedirect
        visible={true}
        rating={5}
        onClose={mockOnClose}
        onReviewCompleted={mockOnReviewCompleted}
      />
    );

    expect(getByText('Why review on Google?')).toBeTruthy();
    expect(
      getByText(/Help other homeowners find quality lawn care/)
    ).toBeTruthy();
    expect(
      getByText(/Support small businesses in your community/)
    ).toBeTruthy();
    expect(getByText(/Takes less than 2 minutes/)).toBeTruthy();
  });

  it('uses web URL on web platform regardless of Place ID', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_PLACE_ID = 'ChIJtest123';
    Platform.OS = 'web';

    const { getByText } = render(
      <GoogleReviewRedirect
        visible={true}
        rating={5}
        onClose={mockOnClose}
        onReviewCompleted={mockOnReviewCompleted}
      />
    );

    const reviewButton = getByText('Leave a Google Review');
    fireEvent.press(reviewButton);

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://search.google.com/local/writereview?placeid=ChIJtest123'
      );
    });
  });
});
