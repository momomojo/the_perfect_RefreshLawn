# CRITICAL BUG REPORT: Database Function Name Mismatch

**Test Date:** 2025-10-16
**Test Environment:** http://localhost:8082 (Remote Supabase Database)
**Severity:** CRITICAL - P0
**Platform:** All (Web/iOS/Android)
**User Role:** All Customers

---

## Executive Summary

ALL booking creation is completely broken due to a database function name mismatch. The trigger `notify_on_booking_change` calls a function named `create_notification_safe`, but the actual function in the database is named `create_safe_notification`. This prevents ANY customer from creating bookings, regardless of payment method.

---

## Impact Assessment

### User Experience Impact

- CRITICAL BLOCKER: NO customer can create ANY booking
- Affects Cash on Delivery bookings (no Stripe involved)
- Affects Card payment bookings
- Error message exposed to users: "function public.create_notification_safe(uuid, text, text, text, jsonb) does not exist"
- Complete failure of core business functionality

### Business Impact

- ZERO REVENUE: No bookings can be created = no revenue
- Complete service outage for booking creation
- Customers cannot use the application AT ALL
- No workaround available
- Production is effectively DOWN for booking functionality

---

## Bug Details

### Reproduction Steps

1. Login as any customer
2. Navigate to Services
3. Select any service
4. Fill in booking details (date, time, address)
5. Select service frequency (one-time or recurring)
6. Select **ANY** payment method (including Cash on Delivery)
7. Click "Confirm Booking"

### Expected Behavior

- Booking is created in database
- Notifications are sent to customer and admins
- Customer sees "Booking Confirmed!" message
- Customer is redirected to dashboard with new booking visible

### Actual Behavior

1. Button shows "processing" state
2. Database trigger fires: `notify_on_booking_change`
3. Trigger attempts to call `create_notification_safe()`
4. PostgreSQL error: "function public.create_notification_safe(uuid, text, text, text, jsonb) does not exist"
5. Booking creation FAILS completely
6. User sees error modal: "Booking Creation Error: function public.create_notification_safe(uuid, text, text, text, jsonb) does not exist"
7. NO booking is created
8. NO notifications are sent

### Console Error Log

```
Error inserting booking: {
  "code":"42883",
  "details":null,
  "hint":"No function matches the given name and argument types. You might need to add explicit type casts.",
  "message":"function public.create_notification_safe(uuid, text, text, text, jsonb) does not exist"
}
```

---

## Evidence

**Screenshots:**

- `e2e/10_cash_booking_confirmation.png` - Booking ready to confirm
- `e2e/11_cash_booking_error.png` - Error modal with database function error

**Database Query Results:**

Actual functions in database:

```sql
SELECT proname, pg_get_function_identity_arguments(oid) as args
FROM pg_proc
WHERE proname LIKE '%notification%'
ORDER BY proname;

Results:
- create_booking_status_notification
- create_notification (p_user_id uuid, p_type text, p_title text, p_message text, p_data jsonb)
- create_safe_notification (p_user_id uuid, p_type text, p_title text, p_message text, p_data jsonb)  <-- CORRECT NAME
- get_unread_notifications_count
- mark_all_notifications_read
- mark_notification_read
- pg_notification_queue_usage
```

**The function is named:** `create_safe_notification`
**The code calls:** `create_notification_safe`

---

## Root Cause Analysis

### The Problem

There is a naming inconsistency between:

1. **What exists in database:** `create_safe_notification()`
2. **What the trigger calls:** `create_notification_safe()`

### Where the Bug Lives

**File:** `supabase/migrations/20251016070000_fix_notification_trigger_type_casting.sql`

Lines calling the WRONG function name:

- Line 35: `PERFORM public.create_notification_safe(...)`
- Line 44: `PERFORM public.create_notification_safe(...)`
- Line 60: `PERFORM public.create_notification_safe(...)`
- Line 71: `PERFORM public.create_notification_safe(...)`
- Line 82: `PERFORM public.create_notification_safe(...)`
- Line 92: `PERFORM public.create_notification_safe(...)`
- Line 101: `PERFORM public.create_notification_safe(...)`

Every single call in the `notify_on_booking_change()` trigger function uses the wrong name.

### How This Happened

1. Original function was likely named `create_safe_notification` (correct)
2. Migration `20251016070000_fix_notification_trigger_type_casting.sql` was created
3. Migration author incorrectly typed the function name as `create_notification_safe`
4. Migration was applied to remote database
5. Trigger now calls non-existent function
6. ALL booking creation fails

### Why This Wasn't Caught

- Migration likely tested locally with a database that had the old function name
- No automated tests verify function names in triggers
- Manual QA testing for booking creation was not performed after migration deployment
- Production validation did not test end-to-end booking creation

---

## Fix Required

### Option 1: Rename Function Call in Trigger (RECOMMENDED)

Create a new migration that updates the trigger to use the correct function name:

**File:** `supabase/migrations/YYYYMMDDHHMMSS_fix_notification_function_name.sql`

```sql
-- Migration: Fix notification function name in booking trigger
-- Description: Change create_notification_safe to create_safe_notification (correct name)
-- Related Issue: All booking creation fails with function does not exist error
-- Priority: CRITICAL - P0
-- Date: 2025-10-16

CREATE OR REPLACE FUNCTION public.notify_on_booking_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_service_name TEXT;
  v_message TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;
    IF v_service_name IS NULL THEN
      v_service_name := 'Unknown Service';
    END IF;
    v_message := 'Your booking for ' || v_service_name || ' has been created.';

    -- FIXED: create_safe_notification (not create_notification_safe)
    PERFORM public.create_safe_notification(
      NEW.customer_id,
      'booking_created'::TEXT,
      'New Booking Created'::TEXT,
      v_message,
      jsonb_build_object('booking_id', NEW.id, 'service_id', NEW.service_id)
    );

    -- Admin notifications
    PERFORM public.create_safe_notification(
      id,
      'booking_created'::TEXT,
      'New Booking Received'::TEXT,
      'A new booking has been created by a customer.'::TEXT,
      jsonb_build_object('booking_id', NEW.id, 'customer_id', NEW.customer_id)
    ) FROM public.profiles WHERE role = 'admin';

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'scheduled' AND OLD.status = 'pending' THEN
      v_message := 'Your booking has been scheduled for ' || NEW.scheduled_date::TEXT || ' at ' || NEW.scheduled_time::TEXT;
      PERFORM public.create_safe_notification(
        NEW.customer_id,
        'booking_updated'::TEXT,
        'Booking Scheduled'::TEXT,
        v_message,
        jsonb_build_object('booking_id', NEW.id, 'status', NEW.status)
      );

      IF NEW.technician_id IS NOT NULL THEN
        v_message := 'You have been assigned a new job on ' || NEW.scheduled_date::TEXT;
        PERFORM public.create_safe_notification(
          NEW.technician_id,
          'booking_updated'::TEXT,
          'New Job Assigned'::TEXT,
          v_message,
          jsonb_build_object('booking_id', NEW.id, 'customer_id', NEW.customer_id)
        );
      END IF;

    ELSIF NEW.status = 'completed' AND OLD.status = 'in_progress' THEN
      PERFORM public.create_safe_notification(
        NEW.customer_id,
        'booking_updated'::TEXT,
        'Service Completed'::TEXT,
        'Your service has been completed. Please leave a review!'::TEXT,
        jsonb_build_object('booking_id', NEW.id)
      );

    ELSIF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
      PERFORM public.create_safe_notification(
        NEW.customer_id,
        'booking_cancelled'::TEXT,
        'Booking Cancelled'::TEXT,
        'Your booking has been cancelled.'::TEXT,
        jsonb_build_object('booking_id', NEW.id)
      );

      IF NEW.technician_id IS NOT NULL THEN
        PERFORM public.create_safe_notification(
          NEW.technician_id,
          'booking_cancelled'::TEXT,
          'Job Cancelled'::TEXT,
          'A job assigned to you has been cancelled.'::TEXT,
          jsonb_build_object('booking_id', NEW.id)
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.notify_on_booking_change() IS 'Trigger function to send notifications based on booking inserts or status updates. FIXED: Uses correct function name create_safe_notification.';
```

### Option 2: Rename Database Function (NOT RECOMMENDED)

Rename the function from `create_safe_notification` to `create_notification_safe`:

- Risky if other code depends on the current name
- Requires checking all other migrations and stored procedures
- More work and higher risk of breaking other things

---

## Verification Steps

After applying the fix migration:

1. Verify migration applied successfully:

   ```sql
   SELECT version FROM supabase_migrations.schema_migrations
   ORDER BY version DESC LIMIT 5;
   ```

2. Test Cash on Delivery booking:
   - Login as customer
   - Create booking with Cash on Delivery
   - Should succeed without errors
   - Verify booking appears in database
   - Verify notifications created

3. Test Card payment booking:
   - Login as customer
   - Create booking with saved card
   - Should succeed (if saved payment method bug is also fixed)
   - Verify booking appears in database
   - Verify notifications created

4. Check logs for errors:
   ```bash
   supabase functions logs --tail
   ```

---

## Related Issues

This bug is SEPARATE from but COMPOUNDED by:

1. **Saved Payment Method Bug:** Saved cards don't work (separate UI/logic issue)
2. **Webhook Integration:** Cannot test webhook flow until this is fixed

---

## Priority Justification

**Why P0 Critical:**

- Complete service outage for ALL booking creation
- No revenue possible
- Affects 100% of customers
- No workaround exists
- Simple fix (single migration)
- Must be fixed before ANY other testing can continue

---

## Timeline

- **Discovered:** 2025-10-16 during final E2E webhook test
- **Impact:** Production has been broken since migration `20251016070000_fix_notification_trigger_type_casting.sql` was deployed
- **Fix Required:** Immediately
- **Deployment:** New migration must be applied to remote database ASAP

---

**Reported by:** Manual QA Testing Agent
**Test Session:** Final E2E Webhook + Polling Integration Test
**Status:** CRITICAL - BLOCKS ALL BOOKING FUNCTIONALITY
**Next Step:** Apply fix migration immediately, then resume webhook testing
