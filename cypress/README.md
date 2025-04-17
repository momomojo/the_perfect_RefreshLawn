# End-to-End Testing with Cypress

This directory contains end-to-end tests for the RefreshLawn application using Cypress.

## Test Structure

- `e2e/`: Contains all test files organized by feature
- `fixtures/`: Contains mock data used in tests
- `support/`: Contains custom commands and global configuration

## Test Files

- `auth.spec.js`: Tests for authentication flows (signup, login, logout)
- `booking.spec.js`: Tests for the booking flow
- `profile.spec.js`: Tests for profile management
- `admin.spec.js`: Tests for admin dashboard functionality
- `network-resilience.spec.js`: Tests for network connectivity handling
- `stripe-integration.spec.js`: Tests for Stripe payment integration

## Running Tests

### Prerequisites

1. Install dependencies:
   ```
   npm install
   ```

2. Set up environment variables in `cypress.config.js` or use a `.env` file.

### Running Tests in the Cypress UI

```
npm run cypress:open
```

This will open the Cypress Test Runner UI where you can select and run individual tests.

### Running Tests Headlessly

```
npm run cypress:run
```

This will run all tests headlessly and generate reports.

### Running Tests with the Application

```
npm run test:e2e
```

This will start the application server and run the tests against it.

## Test Environment

The tests are configured to run against a local development server at `http://localhost:3000`. You can modify the `baseUrl` in `cypress.config.js` to point to a different environment.

## Mocking

The tests use fixtures to mock API responses. You can find these fixtures in the `fixtures/` directory.

- `services.json`: Mock data for services
- `payment-methods.json`: Mock data for payment methods
- `payment-intent.json`: Mock data for payment intents
- `user-profile.json`: Mock data for user profiles
- `admin-bookings.json`: Mock data for admin bookings
- `admin-customers.json`: Mock data for admin customers
- `admin-payments.json`: Mock data for admin payments

## Custom Commands

Custom commands are defined in `support/commands.js` to simplify common operations:

- `login(email, password)`: Log in with the specified credentials
- `createBooking(serviceType, date, time, address, paymentMethod)`: Create a booking
- `addPaymentMethod(cardNumber, expiryDate, cvc, cardholderName)`: Add a payment method
- `setNetworkStatus(online)`: Simulate online/offline status
- `mockStripeAPI(fixture)`: Mock Stripe API responses
- `mockSupabaseAPI(route, fixture)`: Mock Supabase API responses
