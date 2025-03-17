# Lawn Refresh - Project Documentation

## Project Overview

**Lawn Refresh** is a cross-platform lawn care SaaS application built with Expo (React Native) that allows customers to book lawn care services, technicians to manage their jobs, and administrators to oversee the entire platform. The application is designed to support three user roles - Customer, Technician, and Admin - each with dedicated dashboards and permissions.

## Current State of the Project

### Architecture

- **Frontend**: Built with Expo (React Native) using Expo Router for navigation
- **Styling**: Uses NativeWind (Tailwind CSS for React Native)
- **State Management**: Currently using React's useState for local state management

### User Authentication

- Mock authentication flow currently implemented
- Login is simulated with role-based redirection based on email prefix
- Registration form with multi-step process collecting personal information, password, role selection, and address

### Role-Based Interfaces

1. **Customer Dashboard**

   - Home screen with upcoming appointments
   - Quick booking section for various services
   - Recent services with option to rate and view details
   - Lawn care tips section
   - Navigation to profile, services, history, and booking

2. **Technician Dashboard**

   - Overview of assigned jobs
   - Job details view
   - Profile management

3. **Admin Dashboard**
   - Business metrics overview (revenue, jobs completed, customer satisfaction)
   - Today's job overview (scheduled, in-progress, completed, issues)
   - Quick actions for adding users, services, generating reports, and managing payments
   - Navigation to analytics, services, users, and payments pages

### Booking Flow

- Multi-step booking process for customers
- Service selection
- Date and time selection
- Address specification
- Recurring service options
- Payment method selection
- Booking confirmation

### Areas Lacking Implementation

- **Backend Integration**: No actual backend connectivity
- **Authentication**: Using mock authentication instead of real auth system
- **Data Persistence**: Static mock data used throughout the app
- **Payment Processing**: Payment UI exists but no actual payment functionality

## Integration Requirements

### 1. Supabase Integration

#### Authentication

- Setup Supabase client and authentication in the project
- Implement email/password authentication
- Add social login options (Google, Apple, etc.)
- Implement role-based access with JWT tokens
- Set up password reset and email verification

#### Database Tables

1. **profiles**

   - User profile information linked to auth.users
   - Role specification (customer, technician, admin)

2. **services**

   - Service offerings with pricing information
   - Service descriptions and duration estimates

3. **bookings**

   - Service bookings with customer and technician association
   - Status tracking (pending, accepted, in-progress, completed, canceled)

4. **reviews**

   - Service reviews from customers
   - Rating and comments

5. **recurring_plans**

   - Subscription plan definitions

6. **payment_methods**
   - User payment methods (linked to Stripe)

#### Row-Level Security (RLS)

- Setup RLS policies for each table
- Customer access limited to own data
- Technician access limited to assigned jobs
- Admin access to all data

#### Real-time Subscriptions

- Set up real-time updates for job status changes
- Notifications for new bookings, status updates

### 2. Stripe Integration

#### Client-Side

- Implement Stripe React Native SDK
- Add secure payment form for credit card input
- Setup Apple Pay and Google Pay methods

#### Server-Side

- Create Supabase Edge Functions for Stripe API interactions:
  1. Create/retrieve Stripe customer
  2. Create payment intents for one-time payments
  3. Setup and manage subscriptions for recurring services
  4. Handle webhook events from Stripe

#### Payment Flows

1. **One-time Payment**

   - Create payment intent
   - Collect payment details securely
   - Process payment for service booking

2. **Subscription Management**

   - Create Stripe subscription
   - Manage recurring billing
   - Handle cancellations and plan changes

3. **Invoicing**

   - Generate invoices for completed services
   - Email receipts to customers

4. **Admin Payment Management**
   - View all transactions and payment status
   - Process refunds when necessary
   - Monitor subscription status

## Implementation Steps

### Phase 1: Supabase Setup

1. Initialize Supabase client in the project
2. Set up database schema and tables
3. Implement authentication flows
4. Configure Row-Level Security policies
5. Test data fetching with role-based access

### Phase 2: Stripe Integration

1. Set up Stripe account and API keys
2. Create Supabase Edge Functions for Stripe operations
3. Implement secure payment forms in the app
4. Test payment flows for one-time services
5. Implement subscription management

### Phase 3: Connect Frontend to Backend

1. Replace mock data with actual data from Supabase
2. Link booking flow to payment processing
3. Implement real-time updates for job status
4. Add error handling and loading states

### Phase 4: Testing and Refinement

1. Test all user flows end-to-end
2. Optimize performance
3. Enhance error handling and edge cases
4. Implement analytics and monitoring

## Technical Considerations

### Security

- Keep Stripe secret keys on server-side only
- Use Supabase Row-Level Security for data protection
- Implement proper error handling for payment failures
- Secure user authentication with JWT token handling

### Scalability

- Design database schema for future growth
- Implement pagination for large datasets
- Consider caching strategies for frequently accessed data

### User Experience

- Add loading indicators during asynchronous operations
- Implement proper error messages for payment failures
- Add success notifications for completed actions
- Ensure smooth transitions between screens

## Future Enhancements

- GPS tracking for technicians
- In-app messaging between customers and technicians
- Push notifications for booking updates
- Advanced reporting and analytics for admins
- Technician scheduling optimization
- Integration with other payment methods

## Conclusion

The Lawn Refresh application has a solid foundation with well-designed UI components and user flows. The next crucial step is integrating Supabase for backend functionality and Stripe for payment processing. This will transform the current prototype into a fully functional SaaS application ready for production use.
