# Real-Time Updates Testing Guide

**Purpose:** Comprehensive manual and automated testing guide for real-time subscription functionality

---

## 🧪 Manual Testing Procedures

### Prerequisites

1. **Start Local Supabase:**

   ```bash
   npm run supabase:start
   ```

2. **Start Development Server:**

   ```bash
   npm start
   ```

3. **Open Multiple Test Devices:**
   - Web browser (for customer)
   - iOS Simulator or Android Emulator (for technician)
   - Another browser window (for admin)

---

## Test Suite 1: Customer Dashboard

### Test 1.1: Initial Load

**Expected:** Dashboard loads with current bookings

**Steps:**

1. Login as customer (email: customer test credentials)
2. Wait for dashboard to load
3. Verify upcoming appointments section displays

**Pass Criteria:**

- ✅ No infinite loading spinner
- ✅ Appointments displayed correctly
- ✅ Console shows "Setting up real-time subscriptions"

### Test 1.2: Real-Time Booking Creation

**Expected:** New bookings appear instantly

**Steps:**

1. Keep customer dashboard open
2. In another window, login as admin
3. Create a new booking for the customer
4. Watch customer dashboard (don't refresh)

**Pass Criteria:**

- ✅ New booking appears in upcoming appointments within 2 seconds
- ✅ Console shows "Booking update received: INSERT"
- ✅ No page refresh needed

### Test 1.3: Real-Time Status Update

**Expected:** Booking status changes update instantly

**Steps:**

1. Customer dashboard showing booking with status "pending_payment"
2. Admin updates booking status to "scheduled"
3. Watch customer dashboard (don't refresh)

**Pass Criteria:**

- ✅ Status badge updates to "Scheduled" within 2 seconds
- ✅ Console shows "Booking update received: UPDATE"
- ✅ Booking remains in correct section

### Test 1.4: Pull-to-Refresh

**Expected:** Manual refresh works correctly

**Steps:**

1. Scroll to top of customer dashboard
2. Pull down to trigger refresh
3. Release

**Pass Criteria:**

- ✅ Spinner appears
- ✅ Data refreshes
- ✅ Spinner disappears
- ✅ No duplicate bookings

### Test 1.5: Subscription Cleanup

**Expected:** Subscriptions cleanup on logout

**Steps:**

1. Customer dashboard open with active subscription
2. Check browser console - note subscription message
3. Logout
4. Check console again

**Pass Criteria:**

- ✅ Console shows "Cleaning up subscriptions"
- ✅ No error messages
- ✅ Supabase channel removed

### Test 1.6: Missing Payment Statuses

**Expected:** Bookings in payment states show correctly

**Steps:**

1. Create booking with status "pending_payment"
2. Create booking with status "payment_processing"
3. Create booking with status "payment_confirmed"
4. Check customer dashboard

**Pass Criteria:**

- ✅ All three bookings appear in upcoming appointments
- ✅ Status badges show correct colors
- ✅ Statuses formatted correctly

---

## Test Suite 2: Technician Dashboard

### Test 2.1: JobsList Real-Time Assignment

**Expected:** New job assignments appear instantly

**Steps:**

1. Login as technician
2. Navigate to Jobs List screen
3. In admin window, assign a new job to this technician
4. Watch JobsList (don't refresh)

**Pass Criteria:**

- ✅ New job appears in list within 2 seconds
- ✅ Console shows "Real-time booking update"
- ✅ Job has correct customer name and details

### Test 2.2: JobsList Status Update

**Expected:** Job status changes update live

**Steps:**

1. JobsList showing job with status "scheduled"
2. Admin changes status to "in_progress"
3. Watch JobsList

**Pass Criteria:**

- ✅ Status badge updates from blue to purple
- ✅ Job moves to correct filter position (if sorted by status)
- ✅ No duplicate jobs appear

### Test 2.3: TodayJobs Real-Time Filtering

**Expected:** Jobs appear/disappear based on date

**Steps:**

1. Login as technician on Oct 17, 2025
2. Admin creates job for technician scheduled for Oct 17
3. Watch TodayJobs widget
4. Admin changes job date to Oct 18
5. Watch TodayJobs widget again

**Pass Criteria:**

- ✅ Job appears when date = today
- ✅ Job disappears when date changes away from today
- ✅ Count updates correctly ("X of Y completed")

### Test 2.4: TodayJobs Status Filter

**Expected:** Real-time updates respect active filters

**Steps:**

1. TodayJobs widget showing with "All" filter active
2. Click "In Progress" filter
3. Admin updates a job to "in_progress"
4. Watch widget

**Pass Criteria:**

- ✅ Job appears in filtered view
- ✅ Job count updates
- ✅ No jobs from other statuses show

### Test 2.5: Multiple Jobs Update

**Expected:** Multiple simultaneous updates handled correctly

**Steps:**

1. JobsList open
2. Admin rapidly changes 3 different jobs
3. Watch JobsList

**Pass Criteria:**

- ✅ All 3 updates appear
- ✅ No jobs duplicated
- ✅ List remains sorted correctly
- ✅ No race conditions or glitches

---

## Test Suite 3: Admin Dashboard

### Test 3.1: Dashboard Metrics Auto-Update

**Expected:** Metrics update when bookings change

**Steps:**

1. Admin dashboard open, note revenue and completed count
2. In customer window, create new booking worth $100
3. Watch admin dashboard metrics (don't refresh)

**Pass Criteria:**

- ✅ Revenue increases by $100
- ✅ Metrics update within 3 seconds
- ✅ Today's overview refreshes

### Test 3.2: Today's Overview Real-Time

**Expected:** Today's job list updates instantly

**Steps:**

1. Admin dashboard showing today's overview
2. Create new booking for today
3. Watch "Scheduled Jobs" section

**Pass Criteria:**

- ✅ New job appears in list
- ✅ Job count increases
- ✅ Correct time and service shown

### Test 3.3: Admin Bookings List Real-Time

**Expected:** Bookings list updates without navigation

**Steps:**

1. Navigate to Admin → Bookings screen
2. Keep screen open
3. Customer creates new booking
4. Watch bookings list (don't refresh)

**Pass Criteria:**

- ✅ New booking appears at top of list (most recent first)
- ✅ Console shows "Admin Bookings: Real-time update"
- ✅ Search and filters still work after update

### Test 3.4: Admin Pull-to-Refresh

**Expected:** Manual refresh works on all admin screens

**Steps:**

1. Admin dashboard - pull to refresh
2. Navigate to Bookings - pull to refresh

**Pass Criteria:**

- ✅ Both screens show refresh spinner
- ✅ Data reloads correctly
- ✅ No errors in console

### Test 3.5: Admin Sees All User Activity

**Expected:** Admin sees updates from all users

**Steps:**

1. Admin dashboard open
2. Customer A creates booking
3. Technician B updates job status
4. Customer C cancels booking
5. Watch admin dashboard

**Pass Criteria:**

- ✅ All 3 actions trigger dashboard refresh
- ✅ Metrics reflect all changes
- ✅ No updates are missed

---

## Test Suite 4: Edge Cases

### Test 4.1: Rapid Status Changes

**Expected:** System handles rapid updates without breaking

**Steps:**

1. Open customer dashboard
2. Admin rapidly changes booking status 5 times in 10 seconds
3. Watch dashboard

**Pass Criteria:**

- ✅ Final status is correct
- ✅ No duplicate bookings
- ✅ No console errors
- ✅ UI doesn't freeze

### Test 4.2: Network Interruption

**Expected:** Graceful handling of connection loss

**Steps:**

1. Dashboard open with active subscription
2. Disable network (airplane mode or dev tools)
3. Wait 30 seconds
4. Re-enable network

**Pass Criteria:**

- ✅ Subscription reconnects automatically
- ✅ Data syncs when connection restored
- ✅ No crashes or infinite loading

### Test 4.3: Background/Foreground

**Expected:** Subscriptions persist across app states

**Steps:**

1. Mobile app with customer dashboard open
2. Press home button (background app)
3. Wait 1 minute
4. Admin creates new booking
5. Return to app (foreground)

**Pass Criteria:**

- ✅ Dashboard still shows data
- ✅ New booking appears (if subscription persisted)
- ✅ OR dashboard re-fetches on foreground

### Test 4.4: Multiple Tabs (Web Only)

**Expected:** Multiple tabs receive updates independently

**Steps:**

1. Open customer dashboard in Tab 1
2. Open customer dashboard in Tab 2 (same user)
3. Admin creates booking
4. Check both tabs

**Pass Criteria:**

- ✅ Both tabs update
- ✅ Both tabs show same data
- ✅ No conflicts or errors

### Test 4.5: Large Dataset Performance

**Expected:** Real-time works with many bookings

**Setup:** Create 100+ bookings in database

**Steps:**

1. Open admin bookings screen (loads all 100+)
2. Create new booking
3. Watch list

**Pass Criteria:**

- ✅ New booking appears
- ✅ List doesn't lag or stutter
- ✅ Scroll performance remains smooth

---

## Test Suite 5: Cleanup and Memory Leaks

### Test 5.1: Mount/Unmount Cycles

**Expected:** No memory leaks on repeated navigation

**Steps:**

1. Navigate: Dashboard → History → Back to Dashboard (repeat 10x)
2. Check browser console
3. Check browser dev tools Memory tab

**Pass Criteria:**

- ✅ Each "Cleaning up subscriptions" has matching setup
- ✅ Memory usage doesn't continuously grow
- ✅ No "channel already exists" warnings

### Test 5.2: Logout/Login Cycles

**Expected:** Clean subscription state on each login

**Steps:**

1. Login as customer
2. Wait for subscription
3. Logout
4. Login as different customer
5. Repeat 5 times

**Pass Criteria:**

- ✅ Each login creates new subscription
- ✅ Each logout cleans up properly
- ✅ No cross-user data leakage

---

## Automated Testing Examples

### Jest + React Testing Library

```typescript
// app/__tests__/hooks/useRealtimeBookings.test.ts

import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealtimeBookings } from '../../../lib/hooks';

jest.mock('../../../lib/data', () => ({
  subscribeToBookings: jest.fn(),
  unsubscribeFromChannel: jest.fn(),
}));

describe('useRealtimeBookings', () => {
  it('should initialize with empty bookings', () => {
    const { result } = renderHook(() =>
      useRealtimeBookings({ customerId: 'test-123' })
    );

    expect(result.current.bookings).toEqual([]);
    expect(result.current.isSubscribed).toBe(false); // Initially
  });

  it('should subscribe when enabled', async () => {
    const { result } = renderHook(() =>
      useRealtimeBookings({
        customerId: 'test-123',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });
  });

  it('should not subscribe when disabled', () => {
    const { result } = renderHook(() =>
      useRealtimeBookings({
        customerId: 'test-123',
        enabled: false,
      })
    );

    expect(result.current.isSubscribed).toBe(false);
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() =>
      useRealtimeBookings({ customerId: 'test-123' })
    );

    unmount();

    // Verify unsubscribeFromChannel was called
    expect(
      require('../../../lib/data').unsubscribeFromChannel
    ).toHaveBeenCalled();
  });
});
```

### E2E Testing with Playwright

```typescript
// e2e/real-time-updates.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Customer Dashboard Real-Time', () => {
  test('should show new booking instantly', async ({ browser }) => {
    // Create two browser contexts (customer and admin)
    const customerContext = await browser.newContext();
    const adminContext = await browser.newContext();

    const customerPage = await customerContext.newPage();
    const adminPage = await adminContext.newPage();

    // Login as customer
    await customerPage.goto('/login');
    await customerPage.fill('[name="email"]', 'customer@test.com');
    await customerPage.fill('[name="password"]', 'password123');
    await customerPage.click('button[type="submit"]');
    await customerPage.waitForURL('/dashboard');

    // Login as admin
    await adminPage.goto('/login');
    await adminPage.fill('[name="email"]', 'admin@test.com');
    await adminPage.fill('[name="password"]', 'admin123');
    await adminPage.click('button[type="submit"]');

    // Admin creates booking for customer
    await adminPage.goto('/bookings/create');
    await adminPage.selectOption('[name="customer"]', 'customer@test.com');
    await adminPage.selectOption('[name="service"]', 'Lawn Mowing');
    await adminPage.click('button:text("Create Booking")');

    // Customer dashboard should update WITHOUT refresh
    await expect(customerPage.locator('text=Lawn Mowing')).toBeVisible({
      timeout: 3000,
    });

    // Verify no page reload occurred
    const navigationCount = await customerPage.evaluate(
      () => performance.getEntriesByType('navigation').length
    );
    expect(navigationCount).toBe(1); // Only initial load

    await customerContext.close();
    await adminContext.close();
  });
});
```

---

## Performance Benchmarks

### Expected Performance Targets

| Metric                   | Target  | Acceptable | Poor    |
| ------------------------ | ------- | ---------- | ------- |
| Update latency           | < 1s    | < 3s       | > 5s    |
| UI freeze on update      | 0ms     | < 50ms     | > 100ms |
| Memory growth per update | < 1KB   | < 10KB     | > 50KB  |
| Subscription setup time  | < 500ms | < 1s       | > 2s    |

### How to Measure

```typescript
// Add to component for performance testing
useEffect(() => {
  console.time('Real-time update');
  // ... update logic ...
  console.timeEnd('Real-time update');
}, [realtimeBookings]);
```

---

## Debugging Checklist

If real-time updates aren't working:

- [ ] Check Supabase is running: `npx supabase status`
- [ ] Verify user is authenticated: `console.log(user)`
- [ ] Check browser console for subscription messages
- [ ] Verify RLS policies allow user to see data
- [ ] Check Network tab for WebSocket connection
- [ ] Ensure `REPLICA IDENTITY` is set on bookings table
- [ ] Verify no errors in Supabase logs
- [ ] Check if subscription channel exists: `supabase.getChannels()`

---

## Test Completion Matrix

| Test Suite           | Customer | Technician | Admin |
| -------------------- | -------- | ---------- | ----- |
| Initial Load         | ☐        | ☐          | ☐     |
| Real-Time CREATE     | ☐        | ☐          | ☐     |
| Real-Time UPDATE     | ☐        | ☐          | ☐     |
| Real-Time DELETE     | ☐        | ☐          | ☐     |
| Pull-to-Refresh      | ☐        | ☐          | ☐     |
| Subscription Cleanup | ☐        | ☐          | ☐     |
| Edge Cases           | ☐        | ☐          | ☐     |

---

**Once all checkboxes are complete, real-time functionality is production-ready!** ✅
