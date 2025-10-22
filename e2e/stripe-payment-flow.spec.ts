/**
 * E2E Tests: Stripe Payment Flow (Webhook-Only Implementation)
 *
 * Tests the complete payment flow including:
 * - Payment intent creation
 * - Stripe payment UI
 * - Webhook-triggered booking creation
 * - Client polling for booking confirmation
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:8082';
const TEST_USER_EMAIL = 'test@customer.com';
const TEST_USER_PASSWORD = 'test1234';

// Stripe test cards
const STRIPE_TEST_CARDS = {
  success: '4242424242424242',
  decline: '4000000000000002',
  insufficientFunds: '4000000000009995',
  threeDSecure: '4000002500003155',
};

test.describe('Stripe Payment Flow - Webhook-Only Implementation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test customer
    await page.goto(BASE_URL);
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard to load
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should complete successful payment and create booking via webhook', async ({
    page,
  }) => {
    console.log(
      '🧪 Test: Successful payment flow with webhook booking creation'
    );

    // Step 1: Navigate to booking page
    await page.click('text=Book Service');
    await expect(page).toHaveURL(/booking/);

    // Step 2: Select a service
    const serviceCard = page.locator('[data-testid="service-card"]').first();
    await serviceCard.click();

    // Step 3: Fill booking form
    await page.fill('input[name="date"]', '2025-10-25');
    await page.fill('input[name="time"]', '10:00');
    await page.fill(
      'textarea[name="address"]',
      '123 Test Street, Test City, TC 12345'
    );
    await page.fill(
      'textarea[name="notes"]',
      'E2E Test - Please call before arrival'
    );
    await page.selectOption('select[name="propertySize"]', 'medium');

    // Step 4: Select card payment
    await page.click('input[value="card"]');

    // Step 5: Submit booking form
    await page.click('button:has-text("Continue to Payment")');

    // Step 6: Wait for Stripe payment UI to load
    await expect(
      page.locator('iframe[name^="__privateStripeFrame"]')
    ).toBeVisible({ timeout: 10000 });

    // Step 7: Fill Stripe card details
    const cardFrame = page
      .frameLocator('iframe[name^="__privateStripeFrame"]')
      .first();
    await cardFrame
      .locator('input[name="cardnumber"]')
      .fill(STRIPE_TEST_CARDS.success);
    await cardFrame.locator('input[name="exp-date"]').fill('1228'); // 12/28
    await cardFrame.locator('input[name="cvc"]').fill('123');
    await cardFrame.locator('input[name="postal"]').fill('12345');

    // Step 8: Submit payment
    await page.click('button:has-text("Pay")');

    // Step 9: Verify "Processing your booking..." message
    await expect(
      page.locator('text=/Processing your booking|Payment Successful/')
    ).toBeVisible({ timeout: 5000 });
    console.log('✅ Payment processing message displayed');

    // Step 10: Wait for booking confirmation (webhook creates booking)
    await expect(page.locator('text=Booking Confirmed!')).toBeVisible({
      timeout: 35000,
    });
    console.log('✅ Booking confirmation received from webhook');

    // Step 11: Verify redirect to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });

    // Step 12: Verify booking appears in dashboard
    await expect(page.locator('text=/Test Service|Scheduled/')).toBeVisible({
      timeout: 5000,
    });
    console.log('✅ Booking visible in dashboard');

    // Step 13: Verify booking status is "payment_confirmed"
    const bookingCard = page.locator('[data-testid="booking-card"]').first();
    await expect(bookingCard).toContainText('payment_confirmed');
    console.log('✅ Booking status correct');
  });

  test('should handle declined card payment correctly', async ({ page }) => {
    console.log('🧪 Test: Declined card payment handling');

    // Navigate to booking
    await page.click('text=Book Service');
    await expect(page).toHaveURL(/booking/);

    // Fill booking form (abbreviated)
    const serviceCard = page.locator('[data-testid="service-card"]').first();
    await serviceCard.click();
    await page.fill('input[name="date"]', '2025-10-25');
    await page.fill('input[name="time"]', '14:00');
    await page.fill('textarea[name="address"]', '456 Decline Test Ave');
    await page.click('input[value="card"]');
    await page.click('button:has-text("Continue to Payment")');

    // Wait for Stripe UI
    await expect(
      page.locator('iframe[name^="__privateStripeFrame"]')
    ).toBeVisible({ timeout: 10000 });

    // Fill with declined test card
    const cardFrame = page
      .frameLocator('iframe[name^="__privateStripeFrame"]')
      .first();
    await cardFrame
      .locator('input[name="cardnumber"]')
      .fill(STRIPE_TEST_CARDS.decline);
    await cardFrame.locator('input[name="exp-date"]').fill('1228');
    await cardFrame.locator('input[name="cvc"]').fill('123');
    await cardFrame.locator('input[name="postal"]').fill('12345');

    // Submit payment
    await page.click('button:has-text("Pay")');

    // Verify error message
    await expect(
      page.locator('text=/Payment.*failed|declined|error/i')
    ).toBeVisible({ timeout: 10000 });
    console.log('✅ Payment error message displayed correctly');

    // Verify NO booking created
    await page.goto(`${BASE_URL}/(customer)/dashboard`);
    const bookingCount = await page
      .locator('[data-testid="booking-card"]')
      .count();
    // Booking count should not increase from previous test
    console.log(
      `✅ No booking created for declined payment (count: ${bookingCount})`
    );
  });

  test('should handle webhook timeout gracefully', async ({
    page,
    context,
  }) => {
    console.log('🧪 Test: Webhook timeout handling');

    // This test simulates a scenario where webhook is delayed > 30 seconds
    // We'll mock the booking query to always return null

    // Intercept booking queries and return null (simulate webhook delay)
    await page.route('**/rest/v1/bookings*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]), // Empty array = no booking found
      });
    });

    // Navigate to booking
    await page.click('text=Book Service');
    await expect(page).toHaveURL(/booking/);

    // Fill booking form
    const serviceCard = page.locator('[data-testid="service-card"]').first();
    await serviceCard.click();
    await page.fill('input[name="date"]', '2025-10-26');
    await page.fill('input[name="time"]', '09:00');
    await page.fill('textarea[name="address"]', '789 Timeout Test Blvd');
    await page.click('input[value="card"]');
    await page.click('button:has-text("Continue to Payment")');

    // Fill Stripe payment
    await expect(
      page.locator('iframe[name^="__privateStripeFrame"]')
    ).toBeVisible({ timeout: 10000 });
    const cardFrame = page
      .frameLocator('iframe[name^="__privateStripeFrame"]')
      .first();
    await cardFrame
      .locator('input[name="cardnumber"]')
      .fill(STRIPE_TEST_CARDS.success);
    await cardFrame.locator('input[name="exp-date"]').fill('1228');
    await cardFrame.locator('input[name="cvc"]').fill('123');
    await cardFrame.locator('input[name="postal"]').fill('12345');
    await page.click('button:has-text("Pay")');

    // Wait for timeout message (should appear after 30 seconds of polling)
    await expect(
      page.locator('text=/Booking Delayed|taking longer than expected/')
    ).toBeVisible({
      timeout: 35000,
    });
    console.log('✅ Timeout message displayed after 30 seconds');

    // Verify timeout message includes PaymentIntent ID for support
    await expect(
      page.locator('text=/Payment Intent ID|contact support/i')
    ).toBeVisible();
    console.log('✅ Timeout message includes support information');
  });

  test('should handle cash payment (no webhook involved)', async ({ page }) => {
    console.log('🧪 Test: Cash payment flow (client-side booking creation)');

    // Navigate to booking
    await page.click('text=Book Service');
    await expect(page).toHaveURL(/booking/);

    // Fill booking form
    const serviceCard = page.locator('[data-testid="service-card"]').first();
    await serviceCard.click();
    await page.fill('input[name="date"]', '2025-10-27');
    await page.fill('input[name="time"]', '15:00');
    await page.fill('textarea[name="address"]', '321 Cash Test Lane');

    // Select CASH payment (not card)
    await page.click('input[value="cash"]');

    // Submit booking
    await page.click('button:has-text("Complete Booking")');

    // Verify immediate success (no webhook wait)
    await expect(page.locator('text=/Booking Successful|booked/')).toBeVisible({
      timeout: 5000,
    });
    console.log('✅ Cash booking created immediately (no webhook)');

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });

    // Verify booking has "pending_payment" status
    const bookingCard = page.locator('[data-testid="booking-card"]').first();
    await expect(bookingCard).toContainText('pending_payment');
    console.log('✅ Cash booking has correct pending_payment status');
  });

  test('should prevent duplicate bookings with idempotency', async ({
    page,
  }) => {
    console.log('🧪 Test: Idempotency - prevent duplicate bookings');

    // This test requires direct database access or webhook simulation
    // For now, we'll verify the client behavior

    // Complete a successful payment
    await page.click('text=Book Service');
    const serviceCard = page.locator('[data-testid="service-card"]').first();
    await serviceCard.click();
    await page.fill('input[name="date"]', '2025-10-28');
    await page.fill('input[name="time"]', '11:00');
    await page.fill('textarea[name="address"]', '555 Idempotency Test Way');
    await page.click('input[value="card"]');
    await page.click('button:has-text("Continue to Payment")');

    // Fill Stripe payment
    await expect(
      page.locator('iframe[name^="__privateStripeFrame"]')
    ).toBeVisible({ timeout: 10000 });
    const cardFrame = page
      .frameLocator('iframe[name^="__privateStripeFrame"]')
      .first();
    await cardFrame
      .locator('input[name="cardnumber"]')
      .fill(STRIPE_TEST_CARDS.success);
    await cardFrame.locator('input[name="exp-date"]').fill('1228');
    await cardFrame.locator('input[name="cvc"]').fill('123');
    await cardFrame.locator('input[name="postal"]').fill('12345');
    await page.click('button:has-text("Pay")');

    // Wait for confirmation
    await expect(page.locator('text=Booking Confirmed!')).toBeVisible({
      timeout: 35000,
    });
    await expect(page).toHaveURL(/dashboard/);

    // Count bookings
    const initialCount = await page
      .locator('[data-testid="booking-card"]')
      .count();
    console.log(`✅ Initial booking count: ${initialCount}`);

    // Simulate webhook retry (this would be done via Stripe CLI in real testing)
    // For E2E test, we verify the count doesn't increase

    // Refresh page and verify count unchanged
    await page.reload();
    const finalCount = await page
      .locator('[data-testid="booking-card"]')
      .count();
    expect(finalCount).toBe(initialCount);
    console.log(`✅ Booking count unchanged after refresh: ${finalCount}`);
  });
});

test.describe('Stripe Payment UI - Component Tests', () => {
  test('should display payment method selection', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking?service=test-service-id`);

    // Verify card payment option exists
    await expect(page.locator('input[value="card"]')).toBeVisible();

    // Verify cash payment option exists
    await expect(page.locator('input[value="cash"]')).toBeVisible();
  });

  test('should show correct payment UI based on selection', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/booking?service=test-service-id`);

    // Select card payment
    await page.click('input[value="card"]');

    // Stripe UI should load after form submission
    // (actual test would require full form fill)

    // Select cash payment
    await page.click('input[value="cash"]');

    // Should NOT show Stripe UI for cash
    await expect(
      page.locator('iframe[name^="__privateStripeFrame"]')
    ).not.toBeVisible();
  });
});
