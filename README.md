# RefreshLawn App

[![CI](https://github.com/YOUR_USERNAME/the_perfect_RefreshLawn/workflows/CI/badge.svg)](https://github.com/YOUR_USERNAME/the_perfect_RefreshLawn/actions/workflows/ci.yml)
[![EAS Build](https://github.com/YOUR_USERNAME/the_perfect_RefreshLawn/workflows/EAS%20Build/badge.svg)](https://github.com/YOUR_USERNAME/the_perfect_RefreshLawn/actions/workflows/eas-build.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A modern lawn care service management application built with React Native (Expo) and Supabase.

## 🚀 Production Features

- ✅ **Crash Reporting** - Sentry integration for error tracking
- ✅ **Performance Monitoring** - Real-time performance insights
- ✅ **CI/CD Pipeline** - Automated testing and builds
- ✅ **OTA Updates** - Instant updates via EAS Update
- ✅ **Code Quality** - ESLint, Prettier, pre-commit hooks

## Supabase Integration

RefreshLawn is fully integrated with Supabase for:

- **Authentication** - User login, registration, and role management
- **Database** - Storing and querying all application data
- **Real-time updates** - Live updates for bookings, profiles, and notifications
- **Row-Level Security** - Secure data access based on user roles

### Setup Instructions

1. Clone the repository:

```bash
git clone <repository-url>
cd the_perfect_RefreshLawn
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

> 📚 **See [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) for detailed environment variable setup instructions**

4. Validate your environment setup:

```bash
npm run validate-env
```

5. Set up Supabase:
   - Import the migrations from the `supabase/migrations` directory
   - Run migrations in order, starting with the initial schema

6. Start the development server:

```bash
npx expo start
```

## Features

### Authentication

The app uses Supabase Auth with:

- Email/password authentication
- JWT token management with session persistence
- Role-based access control (Customer, Technician, Admin)
- Password reset flow

### Database Schema

The database includes the following tables:

- `profiles` - User profile information
- `services` - Available lawn care services
- `bookings` - Service appointments
- `reviews` - Customer reviews
- `recurring_plans` - Subscription options
- `payment_methods` - Saved payment methods
- `notifications` - User notifications and alerts

### Real-time Features

Real-time subscriptions enable:

- Live booking updates for customers and technicians
- Profile updates and synchronization
- Real-time notifications for booking status changes
- Instant messaging (coming soon)

### Security

Data security is implemented through:

- Postgres Row-Level Security (RLS) policies
- Role-based access control via custom JWT claims
- Secure session management
- Input validation and sanitization

## Development

### Project Structure

- `/app` - Expo Router application screens and components
- `/lib` - Core utilities and services
  - `auth.tsx` - Authentication context and hooks
  - `data.ts` - Database query functions
  - `supabase.ts` - Supabase client configuration
- `/utils` - Helper utilities and functions
- `/supabase` - Supabase configuration and migrations
  - `/migrations` - Database migration files
  - `/functions` - Edge functions (if used)

### Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Start the app on Android
- `npm run ios` - Start the app on iOS
- `npm run web` - Start the app in a web browser
- `npm test` - Run tests

### Testing Supabase Integration

A Supabase Test Hub is included for easy verification of integration features:

- Access it at `/supabase-test-hub` in the app
- Test individual features like auth, real-time, and database operations
- Verify proper RLS policy enforcement across user roles

## Customizing

### Environment Variables

Update the `.env` file with your custom values:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

> 📚 **For complete environment variable documentation, see [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md)**

To validate your environment configuration:

```bash
npm run validate-env
```

### Supabase Schema Changes

To modify the database schema:

1. Create a new migration file in `supabase/migrations`
2. Name it with timestamp prefix, e.g. `20250601000000_add_new_feature.sql`
3. Apply the migration to your Supabase instance

## Troubleshooting

Common issues and solutions:

### Authentication Issues

- **JWT token not refreshing**: Ensure `ENABLE_SESSION_PERSISTENCE` is set to `true` in `lib/supabase.ts`
- **Role not applied**: Check the role assignment in the `create_profile_for_user` trigger

### Real-time Subscription Issues

- **Not receiving updates**: Verify that you've subscribed to the correct channel and events
- **Connection errors**: Check Supabase project configuration for realtime enabled

### Data Access Issues

- **Permission denied**: Review RLS policies to ensure proper access control
- **Data not showing**: Check the SQL query in the data service function

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Supabase team for the excellent backend platform
- Expo team for React Native tooling

## Database Management

This project includes tools for easy database backup and restoration. For more information, see:

- [Database Backup Documentation](./database-backup/README.md) - Detailed instructions for backing up and restoring your Supabase database
- [Quick Start Guide](./database-backup/QUICK_START.md) - Simple step-by-step guide for beginners

To create a database backup:

```bash
# For Mac/Linux
cd database-backup
chmod +x backup.sh
./backup.sh

# For Windows
cd database-backup
backup.bat
```

To restore a database from backup:

```bash
# For Mac/Linux
cd database-backup
chmod +x restore.sh
./restore.sh

# For Windows
cd database-backup
restore.bat
```

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Database Optimizations

The database has been optimized for improved performance and data integrity:

### Indexes

The following indexes have been added to improve query performance:

- **Bookings Table**
  - `idx_bookings_customer_id` - For faster lookup of bookings by customer
  - `idx_bookings_technician_id` - For faster lookup of bookings by technician
  - `idx_bookings_service_id` - For faster lookup of bookings by service
  - `idx_bookings_status` - For faster filtering by booking status
  - `idx_bookings_scheduled_date` - For faster date-based queries
  - `idx_bookings_customer_status` (composite) - For faster lookup of bookings by customer and status
  - `idx_bookings_tech_date` (composite) - For faster lookup of technician schedule by date

- **Profiles Table**
  - `idx_profiles_role` - For faster lookup of users by role

### Constraints

- `valid_status_values` - Ensures booking status values are valid
- `unique_stripe_customer_id` - Prevents duplicate Stripe customer IDs

### Database Functions

- `get_dashboard_metrics()` - Retrieves all dashboard metrics in a single query

### Pagination

List views have been updated with:

- Offset-based pagination for simple use cases
- Cursor-based pagination for larger datasets and better performance

### API Resilience

Added retry logic for transient failures:

- Automatic retries for network errors and server failures
- Exponential backoff to prevent overwhelming the server
