# Supabase Integration Plan

## 1. Project Setup & Configuration ✅

### 1.1 Install Required Dependencies ✅

- [x] Install Supabase core packages
  ```bash
  npm install @supabase/supabase-js
  ```
- [x] Install React Native specific dependencies
  ```bash
  npm install react-native-url-polyfill @react-native-async-storage/async-storage expo-secure-store
  ```
- [x] Install deep linking support
  ```bash
  npm install expo-linking expo-web-browser
  ```

### 1.2 Setup Environment Variables ✅

- [x] Create `.env` file with Supabase credentials
  ```
  EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
  EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
  ```
- [x] Update `app.config.js` to expose environment variables
  ```javascript
  // Update or create app.config.js
  export default {
    expo: {
      // ...other config
      extra: {
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      },
    },
  };
  ```

### 1.3 Initialize Supabase Client ✅

- [x] Create `lib/supabase.ts` client initialization file
  ```typescript
  // Create lib/supabase.ts with appropriate polyfills and client setup
  ```

## 2. Database Schema Setup ✅

### 2.1 Create Base Tables ✅

- [x] Implement `profiles` table SQL
- [x] Implement `services` table SQL
- [x] Implement `bookings` table SQL
- [x] Implement `reviews` table SQL
- [x] Implement `recurring_plans` table SQL
- [x] Implement `payment_methods` table SQL

### 2.2 Create Database Triggers ✅

- [x] Create trigger for profile creation after signup
- [x] Create trigger to update timestamps

### 2.3 Setup Row-Level Security ✅

- [x] Create helper functions for RBAC
- [x] Implement RLS policies for `profiles` table
- [x] Implement RLS policies for `bookings` table
- [x] Implement RLS policies for other tables

## 3. Authentication Implementation ✅

### 3.1 Create Auth Context ✅

- [x] Create `lib/auth.tsx` with AuthProvider and useAuth hook
  ```typescript
  // Create AuthProvider with Supabase auth integration
  ```

### 3.2 Update App Layout ✅

- [x] Modify `app/_layout.tsx` to include AuthProvider
  ```typescript
  // Wrap app with AuthProvider
  ```

### 3.3 Update Auth Components ✅

- [x] Update `app/components/auth/LoginForm.tsx` with Supabase auth
- [x] Update `app/components/auth/RegistrationForm.tsx` with Supabase auth
- [x] Update `app/components/auth/PasswordResetForm.tsx` with Supabase auth
- [x] Update `app/components/auth/NewPasswordForm.tsx` with Supabase auth

### 3.4 Implement Deep Linking ✅

- [x] Configure URL scheme in `app.json`
- [x] Setup deep link handling for auth flows

## 4. Role-Based Access Control ✅

### 4.1 Create Custom JWT Claims ✅

- [x] Implement SQL function to add user role to JWT token

### 4.2 Create Role Protection Components ✅

- [x] Create `app/components/common/ProtectedRoute.tsx` component
- [x] Update role-specific layouts to use protection

## 5. API Integration ✅

### 5.1 Create Data Service ✅

- [x] Create `lib/data.ts` with Supabase queries
  ```typescript
  // Implement data fetching functions using Supabase client
  ```

### 5.2 Update UI Components ✅

- [x] Update Customer Dashboard to use real data
- [x] Update Technician Dashboard to use real data
- [x] Update Admin Dashboard to use real data
- [x] Add loading states and error handling

## 6. Real-time Updates

### 6.1 Setup Supabase Channels

- [ ] Configure real-time subscriptions for bookings
- [ ] Configure real-time subscriptions for profiles
- [ ] Implement notification system using real-time updates

## 7. Testing & Debugging

### 7.1 Test Authentication Flows

- [ ] Test signup, login, logout
- [ ] Test password reset
- [ ] Test role-based routing

### 7.2 Test Database Operations

- [ ] Test CRUD operations with RLS
- [ ] Test real-time subscriptions
- [ ] Verify data integrity across user roles
