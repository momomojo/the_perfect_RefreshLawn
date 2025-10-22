# Quick Test Commands - Review System

**Quick reference for common testing tasks**

---

## Run All Tests

```bash
npm test                     # All unit tests (watch mode)
npm run test:ci              # All tests with coverage
npm run test:e2e             # E2E tests only
```

---

## Run Review System Tests Only

```bash
# All review-related unit tests
npm test -- --testPathPattern="review|feedback|GoogleReview"

# Specific test file
npm test ReviewPromptModal.test.tsx

# E2E tests
npm run test:e2e -- review-workflow.spec.ts
```

---

## Coverage

```bash
# Generate coverage report
npm run test:ci -- --coverage

# View HTML report
open coverage/lcov-report/index.html
```

---

## Debug Tests

```bash
# Watch mode (TDD)
npm test -- --watch

# E2E with UI
npm run test:e2e:ui

# Playwright traces
npx playwright show-trace trace.zip
```

---

## Test Files

```
e2e/review-workflow.spec.ts                                  # E2E (15 tests)
app/components/customer/__tests__/ReviewPromptModal.test.tsx # Main (20 tests)
app/components/customer/__tests__/ReviewPromptModal.error-handling.test.tsx # Errors (17 tests)
app/components/customer/__tests__/LowRatingFeedbackModal.test.tsx # Feedback (20 tests)
app/components/customer/__tests__/GoogleReviewRedirect.test.tsx # Google (24 tests)
lib/hooks/__tests__/useJobCompletion.test.ts                 # Hook (21 tests)
app/(admin)/__tests__/feedback.test.tsx                      # Admin (20 tests)
```

---

## Documentation

- **Coverage Report**: `TEST_COVERAGE_REPORT_REVIEW_SYSTEM.md`
- **Testing Guide**: `REVIEW_SYSTEM_TESTING_GUIDE.md`
- **Deliverables**: `REVIEW_SYSTEM_TEST_DELIVERABLES.md`
- **Test Utilities**: `tests/utils/review-test-helpers.ts`

---

## CI/CD

Tests run automatically on:

- ✅ Every commit (pre-commit hook)
- ✅ Push to branches (full suite)
- ✅ Pull requests (full suite + E2E)
