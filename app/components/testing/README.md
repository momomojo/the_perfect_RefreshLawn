# Supabase Testing Components

This directory contains UI components for manual testing of Supabase functionality within the RefreshLawn app.

## Available Testing Components

- **SupabaseTestHub.tsx**: The main hub component that organizes all tests
- **SupabaseTestUI.tsx**: Component for testing Supabase data operations
- **AuthTest.tsx**: Component for testing authentication operations

## How to Access

These components are accessible through the `/supabase-test` route in the application. Navigate to this route to access the test hub.

## Using the Test Hub

1. Open the app and navigate to `/supabase-test`
2. Select a test module from the available options:
   - **Data Service Tests**: Test Supabase database connections
   - **Authentication Tests**: Test auth methods and JWT role claims

## Data Service Tests

This component allows you to test:

- Fetching services, recurring plans, technicians, and customers
- Error handling for data operations
- Performance of Supabase queries

Each test can be run individually or you can run all tests at once. Results are displayed with success/failure indicators, timing information, and data response.

## Authentication Tests

This component allows you to test:

- User registration and login
- Password reset flow
- JWT role claims validation
- User session management

The component includes form fields for testing authentication operations with different parameters, and displays the results of each operation.

## JWT Role Claims Testing

The JWT role claims functionality is particularly important as it controls access to different parts of the application based on user roles. The authentication tests include a specific test for `getUserRole` which should show:

- The current user's role from JWT claims
- The complete JWT metadata
- User information (ID and email)

If the JWT claims are not working properly, this test will show empty or incomplete data.

## Adding New Tests

To add new tests:

1. Add new test operations to the appropriate component
2. Update the `tests` array with new test definitions
3. Ensure proper error handling and result display
