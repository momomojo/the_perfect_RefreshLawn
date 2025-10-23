# 🚨 URGENT: PAGE REFRESH INFINITE LOADING BUG

**Discovered:** 2025-10-16 during post-fix QA testing
**Severity:** CRITICAL - PRODUCTION BLOCKER
**Status:** UNRESOLVED

---

## THE PROBLEM

**When a logged-in user refreshes the browser page (F5) or navigates to the root URL, the application gets stuck on "Checking authentication..." loading screen FOREVER.**

- ❌ `rolesLoading` remains `true` indefinitely
- ❌ `checkUserRole()` never completes
- ❌ User is BLOCKED from accessing the application
- ❌ Only solution: Clear cache and re-login (terrible UX)

---

## REPRODUCTION (100% Reproducible)

1. Log in as ANY user (customer/technician/admin)
2. Successfully reach dashboard
3. Press F5 (page refresh) OR navigate to http://localhost:8082/
4. **Result:** Infinite "Checking authentication..." loading screen

---

## ROOT CAUSE

The `onAuthStateChange` handler in `lib/auth.tsx` (lines 186-249) calls `await checkUserRole(currentSession.user)` when `SIGNED_IN` event fires during page refresh, but `checkUserRole()` never completes.

**Console Evidence:**

```
Supabase auth event: SIGNED_IN                           ← Fires correctly
[Navigation Effect] Waiting: rolesLoading=true           ← Waits forever
[Navigation Effect] Waiting: rolesLoading=true           ← Repeats forever
... (never progresses)
```

**Missing Logs (compared to successful login):**

```
Role from claims: technician                           ← NEVER APPEARS
[checkUserRole] Setting roles: Admin=false, Tech=...  ← NEVER APPEARS
[checkUserRole] Role determination complete            ← NEVER APPEARS
```

---

## THE FIX (3-Part Solution)

### Part 1: Add Comprehensive Logging to checkUserRole()

**Location:** `lib/auth.tsx` - Line ~294 (start of checkUserRole function)

**Add logging at EVERY step to identify where it's failing:**

```typescript
const checkUserRole = async (targetUser: User | null) => {
  console.log('[checkUserRole] ENTRY - Starting role determination', {
    userId: targetUser?.id,
    timestamp: new Date().toISOString(),
  });

  setRolesLoading(true);

  if (!targetUser) {
    console.log('[checkUserRole] EXIT - No user provided');
    setIsAdmin(false);
    setIsTechnician(false);
    setIsCustomer(false);
    setRolesLoading(false);
    return;
  }

  try {
    console.log('[checkUserRole] Step 1 - Getting session...');
    const {
      data: { session },
    } = await supabase.auth.getSession();

    console.log('[checkUserRole] Step 2 - Session retrieved', {
      hasSession: !!session,
      userId: session?.user?.id,
    });

    if (!session) {
      console.log('[checkUserRole] EXIT - No active session');
      setIsAdmin(false);
      setIsTechnician(false);
      setIsCustomer(true);
      setRolesLoading(false); // ← ADD THIS!
      return;
    }

    console.log('[checkUserRole] Step 3 - Decoding JWT...');
    // Decode JWT logic...

    console.log('[checkUserRole] Step 4 - JWT decoded', {
      hasRoleClaim: !!userRoleClaim,
    });

    // Continue with existing logic, adding console.log at each step...

    console.log('[checkUserRole] Step 5 - Setting role states...');
    setIsAdmin(finalIsAdmin);
    setIsTechnician(finalIsTechnician);
    setIsCustomer(finalIsCustomer);
  } catch (error) {
    console.error('[checkUserRole] EXCEPTION:', error);
    // Existing error handling...
  } finally {
    console.log('[checkUserRole] FINALLY - Setting rolesLoading to false');
    setRolesLoading(false);
  }
};
```

### Part 2: Handle INITIAL_SESSION Event Specially

**Location:** `lib/auth.tsx` - Line ~188 (onAuthStateChange callback)

**Problem:** Both the initial `getSession()` AND the `onAuthStateChange` might be calling `checkUserRole()` simultaneously, causing a race condition.

**Solution:**

```typescript
supabase.auth.onAuthStateChange(async (event, currentSession) => {
  console.log(`Supabase auth event: ${event}`, {
    hasUser: !!currentSession?.user,
    userId: currentSession?.user?.id,
    timestamp: new Date().toISOString(),
  });

  // NEW: Skip INITIAL_SESSION - it was already handled by getSession()
  if (event === 'INITIAL_SESSION') {
    console.log(
      '[Auth] INITIAL_SESSION - Skipping role check (already handled)'
    );
    return;
  }

  if (event === 'TOKEN_REFRESHED') {
    // Existing token refresh logic...
    return;
  }

  // Update session and user state
  setSession(currentSession);
  setUser(currentSession?.user ?? null);

  // Check role AFTER setting user/session state
  if (currentSession?.user) {
    console.log('[Auth] Calling checkUserRole for', currentSession.user.id);
    await checkUserRole(currentSession.user);
  } else {
    // Reset roles when user is null (SIGNED_OUT)
    console.log('[Auth] No user, resetting roles');
    setIsAdmin(false);
    setIsTechnician(false);
    setIsCustomer(false);
    setRolesLoading(false);
  }
});
```

### Part 3: Prevent Race Conditions

**Location:** `lib/auth.tsx` - Add at top of component (with other refs)

**Problem:** Multiple simultaneous calls to `checkUserRole()` might interfere with each other.

**Solution:**

```typescript
// Add this ref near line 71 (with other refs)
const roleCheckInProgressRef = useRef(false);

// Then modify checkUserRole():
const checkUserRole = async (targetUser: User | null) => {
  // Prevent concurrent role checks
  if (roleCheckInProgressRef.current) {
    console.log('[checkUserRole] SKIP - Role check already in progress');
    return;
  }

  console.log('[checkUserRole] ENTRY - Starting role determination');
  roleCheckInProgressRef.current = true;
  setRolesLoading(true);

  try {
    // ... existing logic ...
  } catch (error) {
    // ... existing error handling ...
  } finally {
    console.log('[checkUserRole] FINALLY - Cleanup');
    roleCheckInProgressRef.current = false;
    setRolesLoading(false);
  }
};
```

---

## TESTING AFTER FIX

### Required Tests:

1. **Fresh Session:** Open incognito window → Should see login screen
2. **Login:** Enter credentials → Should redirect to dashboard
3. **Page Refresh (CRITICAL):** Press F5 → Should reload dashboard (NOT stuck)
4. **Navigate to Root:** Click browser back to "/" → Should redirect to dashboard (NOT stuck)
5. **Logout:** Click logout → Should return to login screen
6. **Re-login:** Login again → Should work

### Success Criteria:

✅ Page refresh completes in < 3 seconds
✅ Console shows complete `[checkUserRole]` log sequence
✅ No infinite "Checking authentication..." loading
✅ User can refresh multiple times without issues

---

## WHY THIS HAPPENED

The original fixes (lines 182 and 242) added `setRolesLoading(false)` to handle:

- ✅ Fresh session (no user) → Fixed
- ✅ Logout (user becomes null) → Fixed

But they MISSED the page refresh scenario where:

- User exists (logged in)
- `SIGNED_IN` event fires
- `checkUserRole()` should run but doesn't complete

---

## IMPACT IF NOT FIXED

**User Experience:**

- 🔴 BLOCKER: Any page refresh = application unusable
- 🔴 BLOCKER: Bookmarked dashboard URLs don't work
- 🔴 BLOCKER: Browser back button to root URL = stuck

**Business Impact:**

- Application unusable in real-world scenarios
- Every user WILL hit this within first 5 minutes of use
- Support tickets will flood in
- Reputation damage
- **CANNOT DEPLOY TO PRODUCTION**

---

## NEXT STEPS

1. ✅ **Implement all 3 parts of the fix above**
2. ⏳ **Test thoroughly** (run all 6 tests)
3. ⏳ **Verify console logs show complete sequence**
4. ⏳ **Test on multiple browsers** (Chrome, Firefox, Safari)
5. ⏳ **Test on mobile devices** (iOS/Android)
6. ⏳ **Deploy to production** (only after all tests pass)

---

## QUICK REFERENCE

**File to Edit:** `D:\projects main\the_perfect_RefreshLawn\lib\auth.tsx`

**Lines to Modify:**

- ~71: Add `roleCheckInProgressRef`
- ~188: Add INITIAL_SESSION check in `onAuthStateChange`
- ~294: Add comprehensive logging to `checkUserRole`
- ~310: Add early return if no session in `checkUserRole`

**Related Files:**

- See full test report: `COMPREHENSIVE_QA_TEST_REPORT.md`
- See screenshots: `.playwright-mcp/CRITICAL_BUG_page_refresh_stuck_loading.png`

---

**Status:** UNRESOLVED - BLOCKING PRODUCTION DEPLOYMENT
**Priority:** P0 - CRITICAL
**Estimated Fix Time:** 1-2 hours (implement + test)
