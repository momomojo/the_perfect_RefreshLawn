/**
 * E2E Tests: Customer Review Workflow
 *
 * Tests the complete review flow including:
 * - Automatic review prompt on job completion
 * - Low rating flow (≤3 stars) with feedback modal
 * - High rating flow (≥4 stars) with Google Reviews redirect
 * - Admin feedback management
 * - Edge cases and error handling
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:8082';
const TEST_CUSTOMER_EMAIL = 'test@customer.com';
const TEST_CUSTOMER_PASSWORD = 'test1234';
const TEST_TECHNICIAN_EMAIL = 'tech@test.com';
const TEST_TECHNICIAN_PASSWORD = 'tech1234';
const TEST_ADMIN_EMAIL = 'admin@test.com';
const TEST_ADMIN_PASSWORD = 'admin1234';

/**
 * Helper: Login as a specific role
 */
async function loginAs(
  page: Page,
  email: string,
  password: string,
  expectedRoute: RegExp
) {
  await page.goto(BASE_URL);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Sign In")');
  await expect(page).toHaveURL(expectedRoute, { timeout: 10000 });
}

/**
 * Helper: Create a test booking via API
 * Returns booking ID
 */
async function createTestBooking(
  page: Page,
  customerId: string,
  technicianId: string
): Promise<string> {
  // This would ideally use Supabase API directly, but for E2E we'll simulate via UI
  // In production tests, you'd call the Supabase API here

  // For now, we'll use a placeholder - replace with actual API call
  const bookingId = `test-booking-${Date.now()}`;

  // Execute JS to insert booking via Supabase client
  await page.evaluate(
    async ({ customerId, technicianId, bookingId }) => {
      // @ts-ignore - window.supabase is available in the app
      const { data, error } = await window.supabase
        .from('bookings')
        .insert({
          id: bookingId,
          customer_id: customerId,
          technician_id: technicianId,
          service_id: 'test-service-001',
          status: 'scheduled',
          scheduled_date: new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toISOString(),
          scheduled_time: '10:00',
          address: '123 Test St',
          price: 50.0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    { customerId, technicianId, bookingId }
  );

  return bookingId;
}

/**
 * Helper: Complete a booking via API (technician marks as complete)
 */
async function completeBooking(page: Page, bookingId: string) {
  await page.evaluate(async (id) => {
    // @ts-ignore
    const { error } = await window.supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', id);

    if (error) throw error;
  }, bookingId);
}

/**
 * Helper: Wait for modal to appear
 */
async function waitForModal(page: Page, titleText: string, timeout = 5000) {
  await expect(page.locator(`text="${titleText}"`)).toBeVisible({ timeout });
}

test.describe('Review Workflow - Low Rating Flow (≤3 stars)', () => {
  let bookingId: string;

  test.beforeEach(async ({ page }) => {
    // Login as customer
    await loginAs(
      page,
      TEST_CUSTOMER_EMAIL,
      TEST_CUSTOMER_PASSWORD,
      /customer.*dashboard/
    );

    // Get customer ID from page context
    const customerId = await page.evaluate(() => {
      // @ts-ignore
      return window.localStorage.getItem('supabase.auth.token')
        ? JSON.parse(window.localStorage.getItem('supabase.auth.token')).user.id
        : null;
    });

    // Create and complete a test booking
    bookingId = await createTestBooking(page, customerId, 'test-tech-001');
  });

  test('should show review modal automatically when job completes', async ({
    page,
  }) => {
    console.log('🧪 Test: Auto-show review modal on job completion');

    // Complete the booking (triggers real-time update)
    await completeBooking(page, bookingId);

    // Wait for ReviewPromptModal to appear
    await waitForModal(page, 'Rate Your Service', 10000);
    console.log('✅ Review modal appeared automatically');

    // Verify modal content
    await expect(page.locator('text=How was your')).toBeVisible();
    await expect(page.locator('[data-testid^="star-button-"]')).toHaveCount(5);
    console.log('✅ Review modal content correct');
  });

  test('should show feedback modal for 2-star rating', async ({ page }) => {
    console.log('🧪 Test: Low rating (2 stars) triggers feedback modal');

    await completeBooking(page, bookingId);
    await waitForModal(page, 'Rate Your Service', 10000);

    // Select 2 stars
    await page.locator('[data-testid="star-button-2"]').click();
    await expect(page.locator('text=Could be better')).toBeVisible();

    // Submit rating
    await page.click('button:has-text("Submit Rating")');

    // Verify LowRatingFeedbackModal appears
    await waitForModal(page, 'Help Us Improve', 5000);
    console.log('✅ Feedback modal appeared for low rating');

    // Verify content
    await expect(
      page.locator("text=/sorry your experience wasn't perfect/")
    ).toBeVisible();
    await expect(
      page.locator('placeholder=/Please share specific details/')
    ).toBeVisible();
    console.log('✅ Feedback modal content correct');
  });

  test('should enforce minimum 20 character feedback requirement', async ({
    page,
  }) => {
    console.log('🧪 Test: Feedback minimum character validation');

    await completeBooking(page, bookingId);
    await waitForModal(page, 'Rate Your Service', 10000);

    // Select 1 star and submit
    await page.locator('[data-testid="star-button-1"]').click();
    await page.click('button:has-text("Submit Rating")');
    await waitForModal(page, 'Help Us Improve', 5000);

    // Try submitting short feedback
    const feedbackInput = page.locator(
      'placeholder=/Please share specific details/'
    );
    await feedbackInput.fill('Too short');

    // Submit button should be disabled
    const submitButton = page.locator('button:has-text("Submit Feedback")');
    await expect(submitButton).toBeDisabled();
    console.log('✅ Submit button disabled for short feedback');

    // Verify character counter
    await expect(page.locator('text=/9\/500 characters/')).toBeVisible();

    // Try submitting - should show error
    await submitButton.click();
    await expect(page.locator('text=/at least 20 characters/')).toBeVisible();
    console.log('✅ Error message shown for short feedback');

    // Enter valid feedback
    await feedbackInput.fill(
      'The technician was late and unprofessional. The lawn was not properly trimmed.'
    );
    await expect(submitButton).toBeEnabled();
    await expect(page.locator('text=✓ Ready')).toBeVisible();
    console.log('✅ Submit button enabled for valid feedback');
  });

  test('should save low rating with admin_feedback flag', async ({ page }) => {
    console.log('🧪 Test: Low rating saved with admin_feedback=true');

    await completeBooking(page, bookingId);
    await waitForModal(page, 'Rate Your Service', 10000);

    // Submit 3-star rating
    await page.locator('[data-testid="star-button-3"]').click();
    await page.click('button:has-text("Submit Rating")');
    await waitForModal(page, 'Help Us Improve', 5000);

    // Enter and submit feedback
    const feedback =
      'The service was okay but technician could have communicated better about arrival time.';
    await page
      .locator('placeholder=/Please share specific details/')
      .fill(feedback);
    await page.click('button:has-text("Submit Feedback")');

    // Wait for success confirmation
    await expect(page.locator('text=/Thank you|Submitted/')).toBeVisible({
      timeout: 5000,
    });
    console.log('✅ Feedback submitted successfully');

    // Verify review saved in database with correct flags
    const savedReview = await page.evaluate(async (bid) => {
      // @ts-ignore
      const { data } = await window.supabase
        .from('reviews')
        .select('*')
        .eq('booking_id', bid)
        .single();
      return data;
    }, bookingId);

    expect(savedReview).toBeTruthy();
    expect(savedReview.rating).toBe(3);
    expect(savedReview.comment).toBe(feedback);
    expect(savedReview.admin_feedback).toBe(true);
    expect(savedReview.admin_reviewed).toBe(false);
    console.log('✅ Review saved with correct admin_feedback flag');
  });

  test('should handle "Skip for Now" button correctly', async ({ page }) => {
    console.log('🧪 Test: Skip for Now button on feedback modal');

    await completeBooking(page, bookingId);
    await waitForModal(page, 'Rate Your Service', 10000);

    // Submit 2-star rating
    await page.locator('[data-testid="star-button-2"]').click();
    await page.click('button:has-text("Submit Rating")');
    await waitForModal(page, 'Help Us Improve', 5000);

    // Click Skip for Now
    await page.click('button:has-text("Skip for Now")');

    // Modal should close
    await expect(page.locator('text=Help Us Improve')).not.toBeVisible({
      timeout: 2000,
    });
    console.log('✅ Feedback modal closed on skip');

    // Review should still be saved (rating without comment)
    const savedReview = await page.evaluate(async (bid) => {
      // @ts-ignore
      const { data } = await window.supabase
        .from('reviews')
        .select('*')
        .eq('booking_id', bid)
        .single();
      return data;
    }, bookingId);

    expect(savedReview).toBeTruthy();
    expect(savedReview.rating).toBe(2);
    expect(savedReview.comment).toBeNull();
    console.log('✅ Review saved without comment on skip');
  });
});

test.describe('Review Workflow - High Rating Flow (≥4 stars)', () => {
  let bookingId: string;

  test.beforeEach(async ({ page }) => {
    await loginAs(
      page,
      TEST_CUSTOMER_EMAIL,
      TEST_CUSTOMER_PASSWORD,
      /customer.*dashboard/
    );

    const customerId = await page.evaluate(() => {
      // @ts-ignore
      return JSON.parse(window.localStorage.getItem('supabase.auth.token')).user
        .id;
    });

    bookingId = await createTestBooking(page, customerId, 'test-tech-001');
  });

  test('should show Google Reviews redirect for 5-star rating', async ({
    page,
  }) => {
    console.log(
      '🧪 Test: High rating (5 stars) triggers Google Reviews redirect'
    );

    await completeBooking(page, bookingId);
    await waitForModal(page, 'Rate Your Service', 10000);

    // Select 5 stars
    await page.locator('[data-testid="star-button-5"]').click();
    await expect(page.locator('text=Excellent! 🌟')).toBeVisible();

    // Submit rating
    await page.click('button:has-text("Submit Rating")');

    // Verify GoogleReviewRedirect modal appears
    await waitForModal(page, 'Love Your Service?', 5000);
    console.log('✅ Google Reviews modal appeared for high rating');

    // Verify content
    await expect(
      page.locator('text=/Share your experience on Google/')
    ).toBeVisible();
    await expect(
      page.locator('button:has-text("Leave a Google Review")')
    ).toBeVisible();
    console.log('✅ Google redirect modal content correct');
  });

  test('should show Google Reviews redirect for 4-star rating', async ({
    page,
  }) => {
    console.log('🧪 Test: 4-star rating also triggers Google redirect');

    await completeBooking(page, bookingId);
    await waitForModal(page, 'Rate Your Service', 10000);

    // Select 4 stars
    await page.locator('[data-testid="star-button-4"]').click();
    await page.click('button:has-text("Submit Rating")');

    // Should show Google redirect (not feedback modal)
    await waitForModal(page, 'Love Your Service?', 5000);
    console.log('✅ Google Reviews modal shown for 4-star rating');
  });

  test('should handle "Leave a Google Review" button click', async ({
    page,
    context,
  }) => {
    console.log('🧪 Test: Google Review button opens external link');

    await completeBooking(page, bookingId);
    await waitForModal(page, 'Rate Your Service', 10000);

    await page.locator('[data-testid="star-button-5"]').click();
    await page.click('button:has-text("Submit Rating")');
    await waitForModal(page, 'Love Your Service?', 5000);

    // Listen for popup/new tab
    const [newPage] = await Promise.all([
      context.waitForEvent('page', { timeout: 5000 }).catch(() => null),
      page.click('button:has-text("Leave a Google Review")'),
    ]);

    if (newPage) {
      // Verify URL contains Google domain
      expect(newPage.url()).toMatch(/google\.com/);
      console.log('✅ Google Reviews link opened correctly');
      await newPage.close();
    } else {
      // On some platforms, Linking.openURL doesn't create new page
      console.log(
        '✅ Google Reviews link triggered (platform-specific behavior)'
      );
    }
  });

  test('should save high rating without admin_feedback flag', async ({
    page,
  }) => {
    console.log('🧪 Test: High rating saved with admin_feedback=false');

    await completeBooking(page, bookingId);
    await waitForModal(page, 'Rate Your Service', 10000);

    await page.locator('[data-testid="star-button-5"]').click();
    await page.click('button:has-text("Submit Rating")');
    await waitForModal(page, 'Love Your Service?', 5000);

    // Click "Maybe Later"
    await page.click('button:has-text("Maybe Later")');

    // Verify review saved correctly
    const savedReview = await page.evaluate(async (bid) => {
      // @ts-ignore
      const { data } = await window.supabase
        .from('reviews')
        .select('*')
        .eq('booking_id', bid)
        .single();
      return data;
    }, bookingId);

    expect(savedReview).toBeTruthy();
    expect(savedReview.rating).toBe(5);
    expect(savedReview.admin_feedback).toBeFalsy();
    expect(savedReview.comment).toBeNull();
    console.log('✅ High rating saved without admin_feedback flag');
  });
});

test.describe('Review Workflow - Admin Feedback Management', () => {
  let lowRatingBookingId: string;

  test.beforeEach(async ({ page }) => {
    // Create low-rating review as customer
    await loginAs(
      page,
      TEST_CUSTOMER_EMAIL,
      TEST_CUSTOMER_PASSWORD,
      /customer.*dashboard/
    );

    const customerId = await page.evaluate(() => {
      // @ts-ignore
      return JSON.parse(window.localStorage.getItem('supabase.auth.token')).user
        .id;
    });

    lowRatingBookingId = await createTestBooking(
      page,
      customerId,
      'test-tech-001'
    );
    await completeBooking(page, lowRatingBookingId);

    // Wait for and complete review flow
    await waitForModal(page, 'Rate Your Service', 10000);
    await page.locator('[data-testid="star-button-2"]').click();
    await page.click('button:has-text("Submit Rating")');
    await waitForModal(page, 'Help Us Improve', 5000);
    await page
      .locator('placeholder=/Please share specific details/')
      .fill(
        'The technician damaged my garden hose and left trash in the yard. Very disappointed.'
      );
    await page.click('button:has-text("Submit Feedback")');

    // Wait for submission to complete
    await page.waitForTimeout(2000);

    // Logout
    await page.click('[data-testid="logout-button"]');
  });

  test('should display pending feedback in admin panel', async ({ page }) => {
    console.log('🧪 Test: Admin can view pending feedback');

    // Login as admin
    await loginAs(
      page,
      TEST_ADMIN_EMAIL,
      TEST_ADMIN_PASSWORD,
      /admin.*dashboard/
    );

    // Navigate to Feedback tab
    await page.click('text=Feedback');
    await expect(page).toHaveURL(/admin.*feedback/);

    // Verify pending count badge
    await expect(page.locator('text=/Pending Reviews/')).toBeVisible();
    const pendingCount = await page
      .locator('[data-testid="pending-count"]')
      .textContent();
    expect(parseInt(pendingCount || '0')).toBeGreaterThan(0);
    console.log(`✅ Pending feedback count: ${pendingCount}`);

    // Verify feedback card is visible
    await expect(page.locator('text=/damaged my garden hose/')).toBeVisible();
    console.log('✅ Feedback card displayed correctly');
  });

  test('should allow admin to expand feedback and add notes', async ({
    page,
  }) => {
    console.log('🧪 Test: Admin can expand feedback and add notes');

    await loginAs(
      page,
      TEST_ADMIN_EMAIL,
      TEST_ADMIN_PASSWORD,
      /admin.*dashboard/
    );
    await page.click('text=Feedback');

    // Expand first feedback card
    const feedbackCard = page.locator('[data-testid="feedback-card"]').first();
    await feedbackCard.click();

    // Verify expanded content
    await expect(page.locator('text=Booking Details:')).toBeVisible();
    await expect(page.locator('text=Booking ID:')).toBeVisible();
    console.log('✅ Feedback card expanded');

    // Enter admin notes
    const notesInput = page.locator('placeholder=/Enter notes about actions/');
    const adminNotes =
      'Contacted customer, arranged partial refund, scheduled re-service with senior technician.';
    await notesInput.fill(adminNotes);

    await expect(notesInput).toHaveValue(adminNotes);
    console.log('✅ Admin notes entered successfully');
  });

  test('should mark feedback as reviewed', async ({ page }) => {
    console.log('🧪 Test: Admin can mark feedback as reviewed');

    await loginAs(
      page,
      TEST_ADMIN_EMAIL,
      TEST_ADMIN_PASSWORD,
      /admin.*dashboard/
    );
    await page.click('text=Feedback');

    const initialCount = await page
      .locator('[data-testid="pending-count"]')
      .textContent();

    // Expand and mark as reviewed
    const feedbackCard = page.locator('[data-testid="feedback-card"]').first();
    await feedbackCard.click();

    const notesInput = page.locator('placeholder=/Enter notes about actions/');
    await notesInput.fill('Issue resolved with customer satisfaction.');

    // Handle confirmation dialog
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Mark as Reviewed');
      await dialog.accept();
    });

    await page.click('button:has-text("Mark as Reviewed")');

    // Wait for success toast
    await expect(page.locator('text=/Success|marked as reviewed/')).toBeVisible(
      { timeout: 5000 }
    );
    console.log('✅ Feedback marked as reviewed');

    // Verify pending count decreased
    const newCount = await page
      .locator('[data-testid="pending-count"]')
      .textContent();
    expect(parseInt(newCount || '0')).toBeLessThan(
      parseInt(initialCount || '0')
    );
    console.log(`✅ Pending count decreased: ${initialCount} → ${newCount}`);

    // Verify feedback removed from pending list
    await expect(page.locator('text=/damaged my garden hose/')).not.toBeVisible(
      { timeout: 2000 }
    );
    console.log('✅ Feedback removed from pending list');
  });

  test('should display reviewed feedback in separate tab', async ({ page }) => {
    console.log('🧪 Test: Reviewed feedback appears in Reviewed tab');

    await loginAs(
      page,
      TEST_ADMIN_EMAIL,
      TEST_ADMIN_PASSWORD,
      /admin.*dashboard/
    );
    await page.click('text=Feedback');

    // Mark feedback as reviewed first
    const feedbackCard = page.locator('[data-testid="feedback-card"]').first();
    await feedbackCard.click();
    await page
      .locator('placeholder=/Enter notes about actions/')
      .fill('Test review');

    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button:has-text("Mark as Reviewed")');
    await page.waitForTimeout(1000);

    // Switch to Reviewed tab
    await page.click('button:has-text("Reviewed")');

    // Verify reviewed feedback appears
    await expect(page.locator('text=/Test review/')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('text=/Reviewed on/')).toBeVisible();
    console.log('✅ Reviewed feedback displayed in Reviewed tab');
  });

  test('should handle error when marking feedback as reviewed fails', async ({
    page,
  }) => {
    console.log('🧪 Test: Error handling for failed review submission');

    await loginAs(
      page,
      TEST_ADMIN_EMAIL,
      TEST_ADMIN_PASSWORD,
      /admin.*dashboard/
    );
    await page.click('text=Feedback');

    // Mock API failure
    await page.route('**/rest/v1/reviews*', (route) => route.abort());

    const feedbackCard = page.locator('[data-testid="feedback-card"]').first();
    await feedbackCard.click();

    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button:has-text("Mark as Reviewed")');

    // Verify error toast
    await expect(page.locator('text=/Error|Failed/')).toBeVisible({
      timeout: 5000,
    });
    console.log('✅ Error message displayed correctly');
  });
});

test.describe('Review Workflow - Edge Cases', () => {
  test('should handle "Rate Later" button on review prompt', async ({
    page,
  }) => {
    console.log('🧪 Test: Rate Later button closes modal');

    await loginAs(
      page,
      TEST_CUSTOMER_EMAIL,
      TEST_CUSTOMER_PASSWORD,
      /customer.*dashboard/
    );

    const customerId = await page.evaluate(() => {
      // @ts-ignore
      return JSON.parse(window.localStorage.getItem('supabase.auth.token')).user
        .id;
    });

    const bookingId = await createTestBooking(
      page,
      customerId,
      'test-tech-001'
    );
    await completeBooking(page, bookingId);

    await waitForModal(page, 'Rate Your Service', 10000);

    // Click Rate Later
    await page.click('button:has-text("Rate Later")');

    // Modal should close
    await expect(page.locator('text=Rate Your Service')).not.toBeVisible({
      timeout: 2000,
    });
    console.log('✅ Modal closed on Rate Later');

    // No review should be created
    const review = await page.evaluate(async (bid) => {
      // @ts-ignore
      const { data } = await window.supabase
        .from('reviews')
        .select('*')
        .eq('booking_id', bid)
        .maybeSingle();
      return data;
    }, bookingId);

    expect(review).toBeNull();
    console.log('✅ No review created when rating postponed');
  });

  test('should not show review prompt for booking with existing review', async ({
    page,
  }) => {
    console.log('🧪 Test: No duplicate review prompt');

    await loginAs(
      page,
      TEST_CUSTOMER_EMAIL,
      TEST_CUSTOMER_PASSWORD,
      /customer.*dashboard/
    );

    const customerId = await page.evaluate(() => {
      // @ts-ignore
      return JSON.parse(window.localStorage.getItem('supabase.auth.token')).user
        .id;
    });

    const bookingId = await createTestBooking(
      page,
      customerId,
      'test-tech-001'
    );

    // Create review first
    await page.evaluate(
      async ({ bookingId, customerId }) => {
        // @ts-ignore
        await window.supabase.from('reviews').insert({
          booking_id: bookingId,
          customer_id: customerId,
          technician_id: 'test-tech-001',
          rating: 4,
          comment: 'Already reviewed',
        });
      },
      { bookingId, customerId }
    );

    // Complete booking
    await completeBooking(page, bookingId);

    // Wait a bit to ensure no modal appears
    await page.waitForTimeout(3000);

    // Verify modal does NOT appear
    await expect(page.locator('text=Rate Your Service')).not.toBeVisible();
    console.log('✅ Review prompt correctly suppressed for reviewed booking');
  });

  test('should handle close button (X) on all modals', async ({ page }) => {
    console.log('🧪 Test: Close button works on all modals');

    await loginAs(
      page,
      TEST_CUSTOMER_EMAIL,
      TEST_CUSTOMER_PASSWORD,
      /customer.*dashboard/
    );

    const customerId = await page.evaluate(() => {
      // @ts-ignore
      return JSON.parse(window.localStorage.getItem('supabase.auth.token')).user
        .id;
    });

    const bookingId = await createTestBooking(
      page,
      customerId,
      'test-tech-001'
    );
    await completeBooking(page, bookingId);

    // Test ReviewPromptModal close button
    await waitForModal(page, 'Rate Your Service', 10000);
    await page.locator('[aria-label="Close"]').first().click();
    await expect(page.locator('text=Rate Your Service')).not.toBeVisible({
      timeout: 2000,
    });
    console.log('✅ ReviewPromptModal close button works');

    // Trigger review prompt again
    await completeBooking(page, bookingId);
    await waitForModal(page, 'Rate Your Service', 10000);

    // Submit low rating to trigger feedback modal
    await page.locator('[data-testid="star-button-2"]').click();
    await page.click('button:has-text("Submit Rating")');
    await waitForModal(page, 'Help Us Improve', 5000);

    // Test LowRatingFeedbackModal close button
    await page.locator('[aria-label="Close"]').first().click();
    await expect(page.locator('text=Help Us Improve')).not.toBeVisible({
      timeout: 2000,
    });
    console.log('✅ LowRatingFeedbackModal close button works');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    console.log('🧪 Test: Network error handling during review submission');

    await loginAs(
      page,
      TEST_CUSTOMER_EMAIL,
      TEST_CUSTOMER_PASSWORD,
      /customer.*dashboard/
    );

    const customerId = await page.evaluate(() => {
      // @ts-ignore
      return JSON.parse(window.localStorage.getItem('supabase.auth.token')).user
        .id;
    });

    const bookingId = await createTestBooking(
      page,
      customerId,
      'test-tech-001'
    );
    await completeBooking(page, bookingId);
    await waitForModal(page, 'Rate Your Service', 10000);

    // Mock network failure
    await page.route('**/rest/v1/reviews*', (route) => route.abort());

    await page.locator('[data-testid="star-button-3"]').click();
    await page.click('button:has-text("Submit Rating")');

    // Should show error message
    await expect(page.locator('text=/Error|Failed/')).toBeVisible({
      timeout: 5000,
    });
    console.log('✅ Error message displayed on network failure');
  });

  test('should validate feedback trimming (whitespace removal)', async ({
    page,
  }) => {
    console.log('🧪 Test: Feedback text trimming');

    await loginAs(
      page,
      TEST_CUSTOMER_EMAIL,
      TEST_CUSTOMER_PASSWORD,
      /customer.*dashboard/
    );

    const customerId = await page.evaluate(() => {
      // @ts-ignore
      return JSON.parse(window.localStorage.getItem('supabase.auth.token')).user
        .id;
    });

    const bookingId = await createTestBooking(
      page,
      customerId,
      'test-tech-001'
    );
    await completeBooking(page, bookingId);
    await waitForModal(page, 'Rate Your Service', 10000);

    await page.locator('[data-testid="star-button-2"]').click();
    await page.click('button:has-text("Submit Rating")');
    await waitForModal(page, 'Help Us Improve', 5000);

    // Enter feedback with leading/trailing whitespace
    const feedbackWithSpaces = '   Service was poor and technician was late   ';
    await page
      .locator('placeholder=/Please share specific details/')
      .fill(feedbackWithSpaces);
    await page.click('button:has-text("Submit Feedback")');

    // Verify trimmed version saved
    await page.waitForTimeout(2000);
    const savedReview = await page.evaluate(async (bid) => {
      // @ts-ignore
      const { data } = await window.supabase
        .from('reviews')
        .select('*')
        .eq('booking_id', bid)
        .single();
      return data;
    }, bookingId);

    expect(savedReview.comment).toBe(feedbackWithSpaces.trim());
    console.log('✅ Feedback correctly trimmed before saving');
  });
});

test.describe('Review Workflow - Real-time Updates', () => {
  test('should update admin dashboard in real-time when feedback submitted', async ({
    browser,
  }) => {
    console.log('🧪 Test: Real-time admin dashboard updates');

    // Open two contexts: customer and admin
    const customerContext = await browser.newContext();
    const adminContext = await browser.newContext();

    const customerPage = await customerContext.newPage();
    const adminPage = await adminContext.newPage();

    // Login both users
    await loginAs(
      customerPage,
      TEST_CUSTOMER_EMAIL,
      TEST_CUSTOMER_PASSWORD,
      /customer.*dashboard/
    );
    await loginAs(
      adminPage,
      TEST_ADMIN_EMAIL,
      TEST_ADMIN_PASSWORD,
      /admin.*dashboard/
    );

    // Admin navigates to feedback page
    await adminPage.click('text=Feedback');
    const initialCount = await adminPage
      .locator('[data-testid="pending-count"]')
      .textContent();

    // Customer submits low-rating feedback
    const customerId = await customerPage.evaluate(() => {
      // @ts-ignore
      return JSON.parse(window.localStorage.getItem('supabase.auth.token')).user
        .id;
    });

    const bookingId = await createTestBooking(
      customerPage,
      customerId,
      'test-tech-001'
    );
    await completeBooking(customerPage, bookingId);
    await waitForModal(customerPage, 'Rate Your Service', 10000);
    await customerPage.locator('[data-testid="star-button-1"]').click();
    await customerPage.click('button:has-text("Submit Rating")');
    await waitForModal(customerPage, 'Help Us Improve', 5000);
    await customerPage
      .locator('placeholder=/Please share specific details/')
      .fill('Real-time test feedback for admin dashboard update verification');
    await customerPage.click('button:has-text("Submit Feedback")');

    // Admin should see updated count in real-time
    await expect(
      adminPage.locator('text=/Real-time test feedback/')
    ).toBeVisible({ timeout: 10000 });
    const newCount = await adminPage
      .locator('[data-testid="pending-count"]')
      .textContent();
    expect(parseInt(newCount || '0')).toBeGreaterThan(
      parseInt(initialCount || '0')
    );
    console.log('✅ Admin dashboard updated in real-time');

    // Cleanup
    await customerContext.close();
    await adminContext.close();
  });
});
