# RefreshLawn Testing Documentation

## Overview

This directory contains test files for the RefreshLawn application. The tests are organized by functionality and use Jest as the testing framework. The testing infrastructure includes:

- Unit tests for core functionality
- Component tests for UI elements
- Integration tests for Supabase connectivity
- Authentication tests for JWT claims and user roles

## Test Directory Structure

```
__tests__/
  ├── supabase/                   # Supabase-related tests
  │   ├── JwtRoleClaims.test.ts   # Tests for JWT role claims functionality
  │   ├── SupabaseConnection.test.ts  # Tests for Supabase data functions
  │   └── SupabaseConnection.test.tsx # Tests for Supabase UI components
  └── README.md                   # This file
```

## Manual Testing UI Components

The application includes UI components for manual testing located in:

```
app/components/testing/
  ├── AuthTest.tsx                # UI for testing authentication
  ├── SupabaseTestHub.tsx         # Main hub for all test components
  └── SupabaseTestUI.tsx          # UI for testing Supabase data functions
```

These components are accessible via the `/supabase-test` route in the application.

## Running Tests

### Running All Tests

```bash
npm test
```

### Running Specific Tests

```bash
# Run only Supabase tests
npx jest __tests__/supabase/

# Run a specific test file
npx jest __tests__/supabase/JwtRoleClaims.test.ts

# Run with verbose output
npx jest __tests__/supabase/JwtRoleClaims.test.ts --verbose

# Run with coverage
npx jest --coverage
```

### Debugging Tests

To debug tests for open handles or timer issues:

```bash
npx jest --detectOpenHandles
```

## Test Mocking

The testing infrastructure mocks several dependencies:

1. **Supabase Client**: Mocks the Supabase client to avoid actual API calls
2. **React Native Components**: Mocks native components using Jest setup file
3. **AsyncStorage**: Mocks AsyncStorage for authentication testing
4. **Secure Store**: Mocks Expo Secure Store for secure storage testing

All mocks are configured in `jest.setup.js` and applied through `jest.config.js`.

## JWT Role Claims Testing

The JWT role claims tests verify:

- Role information is correctly added to the JWT token
- Role claims are updated when a user's role changes
- Different roles (customer, technician, admin) are handled correctly

## Supabase Connection Testing

The Supabase connection tests verify:

- Data retrieval functions work correctly
- Error handling is implemented properly
- Role-based access control functions as expected

## Manual Testing through UI

For manual testing of Supabase functionality:

1. Navigate to `/supabase-test` in the application
2. Select "Authentication Tests" or "Data Service Tests"
3. Run individual tests and view the results

These manual tests provide a visual interface for testing Supabase functionality in a development environment.
