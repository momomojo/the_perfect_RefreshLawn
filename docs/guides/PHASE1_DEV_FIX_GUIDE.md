# Phase 1 Notification Bugs - Developer Fix Guide

Quick reference for fixing the 4 critical bugs found in QA testing.

---

## BUG #1: Modal Invisible - CSS/Positioning Issue

**File:** `app/components/common/NotificationsButton.tsx`

**Problem:** Modal exists in DOM but not visible on screen

**Debug Steps:**

1. Check modal overlay z-index (should be high, e.g., 9999)
2. Verify modal container has correct positioning (fixed/absolute)
3. Check opacity/visibility properties
4. Inspect React Native Web modal rendering

**Likely Fix:**

```typescript
// In modal overlay style
style={{
  position: 'fixed',  // or 'absolute'
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  zIndex: 9999,  // Very high z-index
  backgroundColor: 'rgba(0, 0, 0, 0.5)',  // Semi-transparent background
}}
```

**Test After Fix:**

- Click bell icon
- Modal should appear as overlay with notification content
- Take screenshot to verify visibility

---

## BUG #2: Missing RPC Functions

**Files Needed:** New migration file in `supabase/migrations/`

**Problem:** Database functions `mark_notification_read()` and `mark_all_notifications_read()` don't exist

**Fix Required:** Create migration file: `YYYYMMDDHHMMSS_create_notification_rpc_functions.sql`

```sql
-- Mark single notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE id = p_notification_id
  AND user_id = auth.uid();

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark all notifications as read for current user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE user_id = auth.uid()
  AND is_read = false;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get unread count (if missing)
CREATE OR REPLACE FUNCTION get_unread_notifications_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = auth.uid()
    AND is_read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Apply Migration:**

```bash
# Using Supabase CLI
supabase db push

# Or via Supabase MCP
# Use apply_migration tool with the SQL above
```

**Test After Fix:**

```sql
-- Test mark single notification
SELECT mark_notification_read('<notification_id>');

-- Test mark all
SELECT mark_all_notifications_read();

-- Test count
SELECT get_unread_notifications_count();
```

---

## BUG #3: Badge Count Incorrect

**File:** `app/components/common/NotificationsButton.tsx`

**Problem:** Badge shows 0 when unread notifications exist

**Root Cause Candidates:**

1. Initial query not running on mount
2. Real-time subscription setup timing issue
3. State not persisting correctly

**Debug Checklist:**

- [ ] Verify `getUnreadNotificationsCount()` returns correct value
- [ ] Check if query runs on component mount
- [ ] Confirm real-time subscription includes INSERT events
- [ ] Check if unreadCount state resets on navigation

**Likely Fix Pattern:**

```typescript
useEffect(() => {
  // Fetch initial count IMMEDIATELY on mount
  const fetchInitialCount = async () => {
    try {
      const count = await getUnreadNotificationsCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching initial count:', error);
    }
  };

  fetchInitialCount();

  // THEN setup real-time subscription
  const setupSubscription = async () => {
    const channel = await subscribeToNotifications((payload) => {
      // On INSERT: increment count
      if (payload.eventType === 'INSERT' && !payload.new.is_read) {
        setUnreadCount((prev) => prev + 1);
      }
      // On UPDATE: decrement if marked as read
      if (
        payload.eventType === 'UPDATE' &&
        payload.new.is_read &&
        !payload.old.is_read
      ) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    });

    setSubscriptionChannel(channel);
  };

  setupSubscription();

  return () => {
    if (subscriptionChannel) {
      unsubscribeFromChannel(subscriptionChannel);
    }
  };
}, []); // Empty deps - run once on mount
```

**Test After Fix:**

1. Insert notification via Supabase MCP
2. Badge should show "1" immediately (within 1-2 seconds)
3. Navigate to another page
4. Badge should still show "1"
5. Mark notification as read
6. Badge should show "0"

---

## BUG #4: Cannot Navigate to Notifications Screen

**File:** `app/components/common/NotificationsButton.tsx`

**Problem:** "View All Notifications" link doesn't navigate

**Fix Required:** Add proper navigation to the link

```typescript
import { useRouter } from 'expo-router';

const NotificationsButton = () => {
  const router = useRouter();

  // In the "View All Notifications" link/button:
  <TouchableOpacity
    onPress={() => {
      setModalVisible(false); // Close modal first
      router.push('/(technician)/notifications'); // Navigate
    }}
  >
    <Text>View All Notifications</Text>
  </TouchableOpacity>
};
```

**Note:** Route already configured in layout with `href: null`, so programmatic navigation should work.

**Test After Fix:**

1. Click bell icon
2. Click "View All Notifications"
3. Should navigate to notifications history screen
4. Should see filter buttons (All, Unread, Booking, etc.)

---

## Testing Checklist After Fixes

### Manual Testing Required:

**BUG #1 (Modal Visibility):**

- [ ] Click bell icon - modal appears visibly
- [ ] Modal shows notification content
- [ ] Modal has semi-transparent overlay
- [ ] Can close modal with X button

**BUG #2 (RPC Functions):**

- [ ] Click "Mark all as read" - no console errors
- [ ] All notifications marked as read
- [ ] Badge count updates to 0
- [ ] Individual "Mark as read" works

**BUG #3 (Badge Count):**

- [ ] Insert notification - badge shows "1" within 2 seconds
- [ ] Navigate to profile - badge still shows "1"
- [ ] Mark as read - badge updates to "0"
- [ ] Multiple notifications - badge shows correct count

**BUG #4 (Navigation):**

- [ ] Click "View All Notifications" - navigates to history screen
- [ ] Screen shows all notifications
- [ ] Filter buttons visible (All, Unread, etc.)
- [ ] Can navigate back to dashboard

### Automated Testing:

Create tests for:

- Real-time subscription initialization
- Badge count calculation
- RPC function calls
- Navigation routing

---

## Files to Modify

1. `app/components/common/NotificationsButton.tsx` - Fix modal visibility, badge count, navigation
2. `supabase/migrations/YYYYMMDDHHMMSS_create_notification_rpc_functions.sql` - Create RPC functions
3. `lib/data.ts` - Verify RPC function calls (should already be correct)

---

## After Fixes Complete

1. Request QA re-test with command: "Re-test Phase 1 notifications with all fixes applied"
2. Provide confirmation for each bug fixed
3. Include migration file references
4. Include test results showing bugs resolved

---

## Questions?

Refer to detailed bug report: `PHASE_1_NOTIFICATION_CRITICAL_BUGS.md`

- Full bug descriptions
- Root cause analysis
- Console errors
- Screenshots
