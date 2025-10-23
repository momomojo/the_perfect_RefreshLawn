# Review System Testing Guide

Quick reference for testing the customer review workflow feature.

---

## Quick Start

### Run All Tests

```bash
# All unit tests (watch mode)
npm test

# All tests with coverage
npm run test:ci

# E2E tests only
npm run test:e2e

# E2E with Playwright UI (debugging)
npm run test:e2e:ui
```

---

## Test Files Location

### Unit Tests

```
app/components/customer/__tests__/
├── ReviewPromptModal.test.tsx                    # Main review modal (20 tests)
├── ReviewPromptModal.error-handling.test.tsx     # Error & edge cases (17 tests)
├── LowRatingFeedbackModal.test.tsx               # Feedback modal (20 tests)
└── GoogleReviewRedirect.test.tsx                 # Google redirect (24 tests)

lib/hooks/__tests__/
└── useJobCompletion.test.ts                      # Job completion hook (21 tests)

app/(admin)/__tests__/
└── feedback.test.tsx                             # Admin feedback screen (20 tests)
```

### E2E Tests

```
e2e/
└── review-workflow.spec.ts                       # Complete workflows (15 tests)
```

### Test Utilities

```
tests/utils/
└── review-test-helpers.ts                        # Shared test utilities
```

---

## Run Specific Tests

### Single Test File

```bash
npm test ReviewPromptModal.test.tsx
```

### Specific Test Suite

```bash
npm test -- --testNamePattern="Low Rating Flow"
```

### Watch Mode (TDD)

```bash
npm test -- --watch
```

### Coverage for Specific Files

```bash
npm test -- --coverage --collectCoverageFrom='app/components/customer/ReviewPromptModal.tsx'
```

---

## E2E Test Scenarios

### Test Categories

1. **Low Rating Flow (≤3 stars)** - 5 tests
   - Auto-show modal on job completion
   - Conditional feedback modal
   - Validation (20 char minimum)
   - Database save with admin_feedback flag
   - Skip functionality

2. **High Rating Flow (≥4 stars)** - 4 tests
   - Google Reviews redirect
   - Platform-specific URL handling
   - Database save without admin_feedback

3. **Admin Management** - 5 tests
   - View pending feedback
   - Expand and add notes
   - Mark as reviewed
   - Tab navigation
   - Error handling

4. **Edge Cases** - 5 tests
   - Rate Later button
   - Duplicate prevention
   - Close buttons
   - Network errors
   - Data trimming

5. **Real-time Updates** - 1 test
   - Multi-user synchronization

### Run Specific E2E Tests

```bash
# All review workflow tests
npm run test:e2e -- review-workflow.spec.ts

# Specific test by name
npm run test:e2e -- -g "Low Rating Flow"

# Debug mode
npm run test:e2e:ui
```

---

## Test Data Setup

### Using Test Utilities

```typescript
import {
  createMockBooking,
  createLowRatingReviewWithFeedback,
  TEST_USERS,
  simulateBookingStatusUpdate,
} from '../../../tests/utils/review-test-helpers';

// Create test booking
const booking = createMockBooking({
  status: 'completed',
  customer_id: TEST_USERS.customer.id,
});

// Create low-rating review
const review = createLowRatingReviewWithFeedback({
  rating: 2,
  comment: 'Service was disappointing',
});

// Simulate real-time update
simulateBookingStatusUpdate(
  mockChannel,
  'booking-123',
  'in_progress',
  'completed'
);
```

---

## CI/CD Integration

### GitHub Actions

Tests run automatically on:

- Every commit (pre-commit hook - unit tests only)
- Push to any branch (full test suite)
- Pull requests (full suite + E2E)

### Coverage Reports

Coverage reports uploaded to Codecov:

```bash
npm run test:ci -- --coverage
```

View HTML report locally:

```bash
open coverage/lcov-report/index.html
```

---

## Debugging Failed Tests

### Unit Test Failures

1. Run in watch mode: `npm test -- --watch`
2. Add `console.log()` statements
3. Use `screen.debug()` from testing-library
4. Check mock setup in `beforeEach`

### E2E Test Failures

1. Run with UI mode: `npm run test:e2e:ui`
2. Check Playwright traces: `npx playwright show-trace trace.zip`
3. View screenshots: `test-results/[test-name]/screenshot.png`
4. Check video: `test-results/[test-name]/video.webm`

### Common Issues

**Issue**: Tests pass locally but fail in CI

- **Solution**: Check environment variables in CI
- **Solution**: Verify test timeouts are sufficient

**Issue**: Flaky E2E tests

- **Solution**: Increase timeout values
- **Solution**: Add explicit `waitFor` calls
- **Solution**: Check for race conditions

**Issue**: Mock not working

- **Solution**: Verify mock is set up before component render
- **Solution**: Check mock path matches actual import
- **Solution**: Clear mocks in `beforeEach`

---

## Test Coverage Goals

| Category   | Target | Current |
| ---------- | ------ | ------- |
| Statements | 90%    | 93%+    |
| Branches   | 85%    | 90%+    |
| Functions  | 90%    | 95%+    |
| Lines      | 90%    | 93%+    |

**Coverage Command**: `npm run test:ci -- --coverage`

---

## Test Patterns

### Component Testing Pattern

```typescript
describe("ComponentName", () => {
  const mockProps = {
    onAction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render correctly", () => {
    const { getByText } = render(<ComponentName {...mockProps} />);
    expect(getByText("Expected Text")).toBeTruthy();
  });

  it("should call callback on action", () => {
    const { getByText } = render(<ComponentName {...mockProps} />);
    fireEvent.press(getByText("Button"));
    expect(mockProps.onAction).toHaveBeenCalledWith(expectedArgs);
  });
});
```

### E2E Testing Pattern

```typescript
test('should complete user flow successfully', async ({ page }) => {
  console.log('🧪 Test: [Description]');

  // Step 1: Setup
  await loginAs(page, TEST_CUSTOMER_EMAIL, TEST_CUSTOMER_PASSWORD, /dashboard/);

  // Step 2: Action
  await page.click('text=Button');

  // Step 3: Verify
  await expect(page.locator('text=Success')).toBeVisible({ timeout: 5000 });
  console.log('✅ Success message displayed');

  // Step 4: Verify database state
  const data = await page.evaluate(async () => {
    // @ts-ignore
    const { data } = await window.supabase.from('table').select();
    return data;
  });

  expect(data).toBeTruthy();
  console.log('✅ Database updated correctly');
});
```

---

## Testing Checklist

Before merging PRs with review system changes:

- [ ] All unit tests passing locally
- [ ] E2E tests passing locally
- [ ] Coverage maintained (>90%)
- [ ] New tests added for new features
- [ ] Tests are deterministic (no flakiness)
- [ ] Test names are descriptive
- [ ] Mocks are properly isolated
- [ ] Cleanup (beforeEach/afterEach) is correct
- [ ] CI pipeline is green
- [ ] Coverage report reviewed

---

## Manual Testing Scenarios

While automated tests are comprehensive, manual testing should verify:

1. **Real Stripe Integration**
   - Complete payment → Job completion → Review prompt
   - Verify webhook triggers review eligibility

2. **Real-time Behavior**
   - Multiple devices/browsers
   - Network latency scenarios
   - Offline → online transitions

3. **Visual/UX**
   - Modal animations smooth
   - Touch targets comfortable
   - Star hover effects work
   - Loading states clear

4. **Accessibility**
   - Screen reader announcements
   - Keyboard navigation
   - High contrast mode

---

## Test Maintenance

### When to Update Tests

- **Component changes**: Update corresponding test file
- **New features**: Write tests FIRST (TDD)
- **Bug fixes**: Add regression test
- **API changes**: Update mocks in `review-test-helpers.ts`

### Deprecation Strategy

If deprecating old review system:

1. Mark old tests with `describe.skip`
2. Add migration tests
3. Remove old tests after migration verified

---

## Resources

- **Test Coverage Report**: `TEST_COVERAGE_REPORT_REVIEW_SYSTEM.md`
- **Test Utilities**: `tests/utils/review-test-helpers.ts`
- **Playwright Docs**: https://playwright.dev/docs/intro
- **Testing Library**: https://callstack.github.io/react-native-testing-library/

---

## Support

For test-related questions:

1. Review existing test files for patterns
2. Check `review-test-helpers.ts` for utilities
3. Consult `TEST_COVERAGE_REPORT_REVIEW_SYSTEM.md` for coverage details
4. Ask in team chat with specific test failure logs

---

**Last Updated**: 2025-10-20
**Maintained By**: Test Architect (Claude Code)
