/**
 * Test Utilities for Review Workflow
 *
 * Helper functions and mock data factories for testing the customer review system.
 * Use these utilities to maintain consistency across unit, integration, and E2E tests.
 */

import { Booking, Review, Profile } from '../../lib/data';

/**
 * Factory: Create mock booking for testing
 */
export function createMockBooking(overrides?: Partial<Booking>): Booking {
  return {
    id: `booking-${Date.now()}`,
    customer_id: 'customer-test-001',
    technician_id: 'tech-test-001',
    service_id: 'service-test-001',
    status: 'completed',
    scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    scheduled_time: '10:00',
    address: '123 Test Street, Test City, TC 12345',
    price: 50.0,
    created_at: new Date().toISOString(),
    service: {
      id: 'service-test-001',
      name: 'Test Lawn Mowing',
      description: 'Professional test lawn mowing service',
      base_price: 50.0,
      duration_minutes: 60,
      is_active: true,
    },
    ...overrides,
  };
}

/**
 * Factory: Create mock booking with technician profile
 */
export function createMockBookingWithTechnician(
  overrides?: Partial<Booking>
): Booking {
  return createMockBooking({
    technician: {
      id: 'tech-test-001',
      first_name: 'John',
      last_name: 'TechDoe',
      role: 'technician',
      phone: '555-1234',
      created_at: new Date().toISOString(),
    },
    ...overrides,
  });
}

/**
 * Factory: Create mock booking with existing review
 */
export function createMockBookingWithReview(
  rating: number = 5,
  overrides?: Partial<Booking>
): Booking {
  return createMockBooking({
    review: {
      id: `review-${Date.now()}`,
      booking_id: overrides?.id || `booking-${Date.now()}`,
      customer_id: 'customer-test-001',
      technician_id: 'tech-test-001',
      rating,
      comment: rating <= 3 ? 'Test feedback comment' : null,
      admin_feedback: rating <= 3,
      admin_reviewed: false,
      created_at: new Date().toISOString(),
    },
    ...overrides,
  });
}

/**
 * Factory: Create mock review for testing
 */
export function createMockReview(
  rating: number,
  overrides?: Partial<Review>
): Review {
  const isLowRating = rating <= 3;

  return {
    id: `review-${Date.now()}`,
    booking_id: 'booking-test-001',
    customer_id: 'customer-test-001',
    technician_id: 'tech-test-001',
    rating,
    comment: isLowRating ? 'Test feedback comment' : null,
    admin_feedback: isLowRating,
    admin_reviewed: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Factory: Create low-rating review with admin feedback
 */
export function createLowRatingReviewWithFeedback(
  overrides?: Partial<Review>
): Review {
  return createMockReview(2, {
    comment:
      'The technician was late and unprofessional. The lawn was not properly trimmed and debris was left behind.',
    admin_feedback: true,
    admin_reviewed: false,
    ...overrides,
  });
}

/**
 * Factory: Create reviewed admin feedback
 */
export function createReviewedAdminFeedback(
  overrides?: Partial<Review>
): Review {
  return createLowRatingReviewWithFeedback({
    admin_reviewed: true,
    admin_reviewed_at: new Date().toISOString(),
    admin_reviewed_by: 'admin-test-001',
    admin_notes:
      'Contacted customer, issued partial refund, scheduled re-service with senior technician.',
    ...overrides,
  });
}

/**
 * Mock: Supabase real-time channel for testing
 */
export function createMockRealtimeChannel() {
  const mockOn = jest.fn().mockReturnThis();
  const mockSubscribe = jest.fn().mockReturnValue({
    unsubscribe: jest.fn().mockResolvedValue({ error: null }),
  });
  const mockUnsubscribe = jest.fn().mockResolvedValue({ error: null });

  return {
    on: mockOn,
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
    _triggerUpdate: (payload: any) => {
      // Helper to trigger callback in tests
      const callback = mockOn.mock.calls[0]?.[2];
      if (callback) callback(payload);
    },
  };
}

/**
 * Mock: Supabase client for review workflow tests
 */
export function createMockSupabaseClient() {
  const mockChannel = createMockRealtimeChannel();

  return {
    channel: jest.fn(() => mockChannel),
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    removeChannel: jest.fn(),
    _mockChannel: mockChannel,
  };
}

/**
 * Helper: Simulate booking status update in tests
 */
export function simulateBookingStatusUpdate(
  mockChannel: any,
  bookingId: string,
  oldStatus: string,
  newStatus: string
) {
  const payload = {
    eventType: 'UPDATE',
    old: { id: bookingId, status: oldStatus },
    new: { id: bookingId, status: newStatus },
  };

  mockChannel._triggerUpdate(payload);
}

/**
 * Helper: Wait for async state updates in tests
 */
export async function waitForAsyncUpdates(ms: number = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Assertion Helper: Verify review has correct admin_feedback flag
 */
export function expectAdminFeedbackFlag(review: Review, rating: number): void {
  if (rating <= 3) {
    expect(review.admin_feedback).toBe(true);
    expect(review.comment).toBeTruthy();
  } else {
    expect(review.admin_feedback).toBeFalsy();
  }
}

/**
 * Assertion Helper: Verify review is properly marked as reviewed
 */
export function expectReviewMarkedAsReviewed(
  review: Review,
  adminId: string
): void {
  expect(review.admin_reviewed).toBe(true);
  expect(review.admin_reviewed_by).toBe(adminId);
  expect(review.admin_reviewed_at).toBeTruthy();
  expect(review.admin_notes).toBeTruthy();
}

/**
 * Test Data: Sample feedback comments by rating
 */
export const SAMPLE_FEEDBACK = {
  rating1: [
    'Terrible service, technician damaged my property',
    'Worst experience ever, lawn looks worse than before',
    'Unprofessional behavior and poor quality work',
  ],
  rating2: [
    'Service was late and technician was unprofessional',
    'Lawn not properly trimmed, debris left behind',
    'Expected much better for the price paid',
  ],
  rating3: [
    'Average service, nothing special',
    'Could improve communication and timeliness',
    'Adequate work but room for improvement',
  ],
  rating4: [
    'Good service, minor improvements needed',
    'Professional technician, lawn looks nice',
    'Satisfied with the results overall',
  ],
  rating5: [
    'Excellent service! Highly recommend',
    'Perfect job, lawn looks amazing',
    'Outstanding professionalism and quality',
  ],
};

/**
 * Test Configuration: Timeouts for async operations
 */
export const TEST_TIMEOUTS = {
  realtimeUpdate: 5000, // Wait for real-time subscription update
  modalAppear: 3000, // Wait for modal to appear
  apiCall: 2000, // Wait for API call completion
  asyncStateUpdate: 100, // Wait for React state update
};

/**
 * Test Configuration: Test user credentials
 */
export const TEST_USERS = {
  customer: {
    id: 'customer-test-001',
    email: 'test@customer.com',
    password: 'test1234',
    role: 'customer' as const,
  },
  technician: {
    id: 'tech-test-001',
    email: 'tech@test.com',
    password: 'tech1234',
    role: 'technician' as const,
  },
  admin: {
    id: 'admin-test-001',
    email: 'admin@test.com',
    password: 'admin1234',
    role: 'admin' as const,
  },
};

/**
 * Helper: Create test profile
 */
export function createMockProfile(
  role: 'customer' | 'technician' | 'admin',
  overrides?: Partial<Profile>
): Profile {
  return {
    id: `${role}-test-001`,
    first_name: 'Test',
    last_name: role.charAt(0).toUpperCase() + role.slice(1),
    role,
    phone: '555-0123',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock: Google Place ID for testing
 */
export const MOCK_GOOGLE_PLACE_ID = 'ChIJtest123456789';

/**
 * Helper: Mock environment variables for tests
 */
export function mockEnvironmentVariables(
  overrides?: Record<string, string>
): void {
  const defaults = {
    EXPO_PUBLIC_GOOGLE_PLACE_ID: MOCK_GOOGLE_PLACE_ID,
    EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  };

  Object.entries({ ...defaults, ...overrides }).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

/**
 * Helper: Clear environment variables after tests
 */
export function clearEnvironmentVariables(): void {
  delete process.env.EXPO_PUBLIC_GOOGLE_PLACE_ID;
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
}

/**
 * Test Snapshot: Expected database review structure
 */
export interface ExpectedReviewInDatabase {
  booking_id: string;
  customer_id: string;
  technician_id: string;
  rating: number;
  comment: string | null;
  admin_feedback: boolean;
  admin_reviewed: boolean;
  admin_reviewed_at?: string;
  admin_reviewed_by?: string;
  admin_notes?: string;
}

/**
 * Helper: Build expected review structure for assertions
 */
export function buildExpectedReview(
  rating: number,
  comment: string | null,
  bookingId: string = 'booking-test-001'
): ExpectedReviewInDatabase {
  return {
    booking_id: bookingId,
    customer_id: 'customer-test-001',
    technician_id: 'tech-test-001',
    rating,
    comment,
    admin_feedback: rating <= 3 && !!comment,
    admin_reviewed: false,
  };
}
