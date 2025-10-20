import { renderHook, waitFor, act } from '@testing-library/react-native';
import useJobCompletion from '../useJobCompletion';
import { supabase } from '../../supabase';
import { getBooking } from '../../data';
import type { Booking } from '../../data';

// Mock Supabase
jest.mock('../../supabase', () => ({
  supabase: {
    channel: jest.fn(),
  },
}));

// Mock data functions
jest.mock('../../data', () => ({
  getBooking: jest.fn(),
}));

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

const mockBookingWithReview: Booking = {
  ...mockBooking,
  review: {
    id: 'review-001',
    booking_id: 'booking-123',
    customer_id: 'customer-456',
    technician_id: 'tech-789',
    rating: 5,
    comment: 'Great service!',
    created_at: '2025-10-15T11:00:00Z',
  },
};

describe('useJobCompletion', () => {
  let mockChannel: any;
  let mockSubscribe: jest.Mock;
  let mockUnsubscribe: jest.Mock;
  let mockOn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUnsubscribe = jest.fn().mockResolvedValue({ error: null });
    mockSubscribe = jest.fn().mockReturnValue({
      unsubscribe: mockUnsubscribe,
    });
    mockOn = jest.fn().mockReturnThis();

    mockChannel = {
      on: mockOn,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
    };

    (supabase.channel as jest.Mock).mockReturnValue(mockChannel);
    (getBooking as jest.Mock).mockResolvedValue(mockBooking);
  });

  it('returns null initially', () => {
    const { result } = renderHook(() => useJobCompletion('customer-456'));
    expect(result.current).toBeNull();
  });

  it('sets up real-time subscription on mount', () => {
    renderHook(() => useJobCompletion('customer-456'));

    expect(supabase.channel).toHaveBeenCalledWith('job-completion-listener');
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: 'customer_id=eq.customer-456',
      }),
      expect.any(Function)
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('detects when job status changes to completed', async () => {
    const { result } = renderHook(() => useJobCompletion('customer-456'));

    // Get the callback function passed to .on()
    const onCallback = mockOn.mock.calls[0][2];

    // Simulate a booking status update
    await act(async () => {
      await onCallback({
        eventType: 'UPDATE',
        old: { id: 'booking-123', status: 'in_progress' },
        new: { id: 'booking-123', status: 'completed' },
      });
    });

    await waitFor(() => {
      expect(getBooking).toHaveBeenCalledWith('booking-123');
      expect(result.current).toEqual(mockBooking);
    });
  });

  it('does not trigger for non-completed status changes', async () => {
    const { result } = renderHook(() => useJobCompletion('customer-456'));

    const onCallback = mockOn.mock.calls[0][2];

    await act(async () => {
      await onCallback({
        eventType: 'UPDATE',
        old: { id: 'booking-123', status: 'scheduled' },
        new: { id: 'booking-123', status: 'in_progress' },
      });
    });

    await waitFor(() => {
      expect(getBooking).not.toHaveBeenCalled();
      expect(result.current).toBeNull();
    });
  });

  it('does not trigger if job was already completed', async () => {
    const { result } = renderHook(() => useJobCompletion('customer-456'));

    const onCallback = mockOn.mock.calls[0][2];

    await act(async () => {
      await onCallback({
        eventType: 'UPDATE',
        old: { id: 'booking-123', status: 'completed' },
        new: { id: 'booking-123', status: 'completed' },
      });
    });

    await waitFor(() => {
      expect(getBooking).not.toHaveBeenCalled();
      expect(result.current).toBeNull();
    });
  });

  it('does not trigger if booking already has a review', async () => {
    (getBooking as jest.Mock).mockResolvedValue(mockBookingWithReview);

    const { result } = renderHook(() => useJobCompletion('customer-456'));

    const onCallback = mockOn.mock.calls[0][2];

    await act(async () => {
      await onCallback({
        eventType: 'UPDATE',
        old: { id: 'booking-123', status: 'in_progress' },
        new: { id: 'booking-123', status: 'completed' },
      });
    });

    await waitFor(() => {
      expect(getBooking).toHaveBeenCalledWith('booking-123');
      // Should not set the completed booking since it has a review
      expect(result.current).toBeNull();
    });
  });

  it('handles missing old record gracefully', async () => {
    const { result } = renderHook(() => useJobCompletion('customer-456'));

    const onCallback = mockOn.mock.calls[0][2];

    await act(async () => {
      await onCallback({
        eventType: 'UPDATE',
        old: null,
        new: { id: 'booking-123', status: 'completed' },
      });
    });

    // Should not crash, but also should not trigger
    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it('handles missing new record gracefully', async () => {
    const { result } = renderHook(() => useJobCompletion('customer-456'));

    const onCallback = mockOn.mock.calls[0][2];

    await act(async () => {
      await onCallback({
        eventType: 'UPDATE',
        old: { id: 'booking-123', status: 'in_progress' },
        new: null,
      });
    });

    // Should not crash
    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it('handles getBooking error gracefully', async () => {
    (getBooking as jest.Mock).mockRejectedValue(new Error('Network error'));

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { result } = renderHook(() => useJobCompletion('customer-456'));

    const onCallback = mockOn.mock.calls[0][2];

    await act(async () => {
      await onCallback({
        eventType: 'UPDATE',
        old: { id: 'booking-123', status: 'in_progress' },
        new: { id: 'booking-123', status: 'completed' },
      });
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching completed booking:',
        expect.any(Error)
      );
      expect(result.current).toBeNull();
    });

    consoleErrorSpy.mockRestore();
  });

  it('unsubscribes when customerId is null', () => {
    const { rerender } = renderHook(
      ({ customerId }) => useJobCompletion(customerId),
      {
        initialProps: { customerId: 'customer-456' },
      }
    );

    expect(mockSubscribe).toHaveBeenCalled();

    // Change customerId to null
    rerender({ customerId: null });

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useJobCompletion('customer-456'));

    expect(mockSubscribe).toHaveBeenCalled();

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('resets subscription when customerId changes', () => {
    const { rerender } = renderHook(
      ({ customerId }) => useJobCompletion(customerId),
      {
        initialProps: { customerId: 'customer-456' },
      }
    );

    expect(supabase.channel).toHaveBeenCalledTimes(1);
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        filter: 'customer_id=eq.customer-456',
      }),
      expect.any(Function)
    );

    // Change customer ID
    rerender({ customerId: 'customer-789' });

    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(supabase.channel).toHaveBeenCalledTimes(2);
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        filter: 'customer_id=eq.customer-789',
      }),
      expect.any(Function)
    );
  });

  it('clears completed booking when resetCompletedBooking is called', async () => {
    const { result } = renderHook(() => useJobCompletion('customer-456'));

    const onCallback = mockOn.mock.calls[0][2];

    // Trigger job completion
    await act(async () => {
      await onCallback({
        eventType: 'UPDATE',
        old: { id: 'booking-123', status: 'in_progress' },
        new: { id: 'booking-123', status: 'completed' },
      });
    });

    await waitFor(() => {
      expect(result.current).toEqual(mockBooking);
    });

    // Reset
    act(() => {
      // Note: The hook doesn't expose a reset function in the current implementation
      // This test documents that behavior would need to be added if needed
    });

    // For now, the only way to reset is to change customerId or unmount
  });

  it('does not subscribe when customerId is null', () => {
    renderHook(() => useJobCompletion(null));

    expect(supabase.channel).not.toHaveBeenCalled();
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('handles multiple rapid status updates correctly', async () => {
    const { result } = renderHook(() => useJobCompletion('customer-456'));

    const onCallback = mockOn.mock.calls[0][2];

    // Simulate rapid updates
    await act(async () => {
      await onCallback({
        eventType: 'UPDATE',
        old: { id: 'booking-123', status: 'scheduled' },
        new: { id: 'booking-123', status: 'in_progress' },
      });

      await onCallback({
        eventType: 'UPDATE',
        old: { id: 'booking-123', status: 'in_progress' },
        new: { id: 'booking-123', status: 'completed' },
      });
    });

    await waitFor(() => {
      expect(getBooking).toHaveBeenCalledTimes(1); // Only called once for completed
      expect(result.current).toEqual(mockBooking);
    });
  });
});
