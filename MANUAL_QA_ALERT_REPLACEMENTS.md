# Manual QA Test Plan - Alert.alert Replacements

**Date:** 2025-10-22
**Target:** Alert.alert replacement validation
**Automated Tests:** ✅ 120 tests passing (100%)
**Manual QA Required:** Visual, UX, Accessibility

---

## Overview

All 36 Alert.alert instances have been replaced with cross-platform compatible utilities:

- `showNotification()` - Simple alerts (error, success, info)
- `showConfirmation()` - Confirmation dialogs with OK/Cancel

Automated tests verify functionality. Manual QA needed for visual appearance, UX timing, and accessibility.

---

## Priority 1: Critical User Flows

### 1. Technician Job Completion Flow

**Platform:** Web, iOS, Android
**Path:** Technician Dashboard → Job Details → Complete Job

#### Test Steps:

1. Log in as technician
2. Navigate to an active job
3. Click "Start Job" button
   - **Verify:** Success notification appears: "Job started"
   - **Check:** Green toast on web, native alert on iOS/Android
4. Upload before photo
   - **Verify:** Success notification: "Before photo uploaded"
5. Upload after photo
   - **Verify:** Success notification: "After photo uploaded"
6. Click "Complete Job" button
   - **Verify:** Confirmation dialog appears: "Mark this job as completed? Customer will be notified."
   - **Check:** Modal on web, native alert on iOS/Android
7. Click "Complete" in confirmation
   - **Verify:** Success notification: "Job completed successfully"

#### Error Scenarios:

- Try completing without before photo
  - **Verify:** Error notification: "Please upload a before photo before completing the job"
- Try completing without after photo
  - **Verify:** Error notification: "Please upload an after photo before completing the job"
- Network failure during status update
  - **Verify:** Error notification with appropriate message

**Priority:** HIGH
**Platforms:** Web, iOS, Android

---

### 2. Technician Schedule Management

**Platform:** Web, iOS, Android
**Path:** Technician Dashboard → Schedule

#### Test Steps:

1. Add new availability slot
   - Enter Monday 9:00 AM - 5:00 PM
   - Click Save
   - **Verify:** Success notification: "Availability saved successfully"

2. Delete availability slot
   - Click delete icon on an availability slot
   - **Verify:** Confirmation dialog: "Are you sure you want to delete this availability slot?"
   - **Check:** "Delete" button is red/destructive style
   - Click "Delete"
   - **Verify:** Success notification: "Availability deleted successfully"
   - Click "Cancel"
   - **Verify:** Nothing happens, slot remains

3. Apply preset
   - Click "Apply Preset" button
   - **Verify:** Confirmation dialog: "This will replace your current schedule. Continue?"
   - Click "Apply"
   - **Verify:** Success notification

4. Paste week pattern
   - Copy a week
   - Paste to different week
   - **Verify:** Confirmation dialog: "This will overwrite the current week. Continue?"

#### Error Scenarios:

- Try creating conflicting time slot
  - **Verify:** Error notification: "This time slot conflicts with existing availability"
- Try saving with invalid time range (end before start)
  - **Verify:** Error notification: "End time must be after start time"
- Network failure during save
  - **Verify:** Error notification with appropriate message

**Priority:** HIGH
**Platforms:** Web, iOS, Android

---

### 3. User Login and Profile Management

**Platform:** Web, iOS, Android
**Path:** Login Screen / Profile Screen

#### Test Steps - Login:

1. Enter invalid email (missing @)
   - Click "Sign In"
   - **Verify:** Error notification: "Please enter a valid email address"

2. Enter email without password
   - Click "Sign In"
   - **Verify:** Error notification: "Please enter your password"

3. Enter wrong credentials
   - **Verify:** Error notification: "Invalid credentials" (or similar)

#### Test Steps - Profile:

1. Navigate to Profile screen
2. Clear first name field
   - Click Save
   - **Verify:** Error notification: "First name is required"

3. Update profile successfully
   - Enter valid data
   - Click Save
   - **Verify:** Success notification: "Profile updated successfully"

4. Upload avatar
   - Click avatar upload button
   - Select image over 5MB
   - **Verify:** Error notification: "Image must be less than 5MB"
   - Select valid image
   - **Verify:** Success notification: "Avatar updated successfully"

**Priority:** HIGH
**Platforms:** Web, iOS, Android

---

### 4. Admin Feedback Review

**Platform:** Web (admin dashboard)
**Path:** Admin Dashboard → Feedback

#### Test Steps:

1. Navigate to Feedback page
2. Click "Mark as Reviewed" on a feedback item
   - **Verify:** Confirmation dialog: "Mark this feedback as reviewed?"
   - Click "Mark Reviewed"
   - **Verify:** Success notification: "Feedback marked as reviewed"
   - Click "Cancel"
   - **Verify:** Nothing happens

#### Error Scenarios:

- Network failure during mark as reviewed
  - **Verify:** Error notification with error message

**Priority:** MEDIUM
**Platforms:** Web only

---

## Priority 2: Visual Validation

### Web Platform

#### Toast Notifications

**Location:** Top of screen
**Test Each Type:**

1. **Success Notification** (green)
   - Trigger any success action
   - **Check:** Green background, white text
   - **Check:** Checkmark icon visible
   - **Check:** Auto-dismisses after 4 seconds
   - **Check:** Can manually dismiss by clicking X

2. **Error Notification** (red)
   - Trigger any error action
   - **Check:** Red background, white text
   - **Check:** Error icon visible
   - **Check:** Auto-dismisses after 4 seconds
   - **Check:** Can manually dismiss by clicking X

3. **Info Notification** (blue)
   - Trigger any info action
   - **Check:** Blue background, white text
   - **Check:** Info icon visible
   - **Check:** Auto-dismisses after 4 seconds

#### Confirmation Modals

**Location:** Center of screen

1. **Standard Confirmation**
   - **Check:** Modal overlay darkens background
   - **Check:** Title text bold and prominent
   - **Check:** Message text readable
   - **Check:** Two buttons: Cancel (gray) and Confirm (blue)
   - **Check:** Can dismiss by clicking outside modal (optional)
   - **Check:** ESC key closes modal (optional)

2. **Destructive Confirmation** (delete actions)
   - **Check:** Confirm button is RED
   - **Check:** Title and message convey seriousness
   - **Check:** Cancel button still gray

**Priority:** HIGH
**Platform:** Web

---

### iOS Platform

#### Native Alerts

1. **Simple Alert**
   - Trigger any error notification
   - **Check:** Native iOS alert appears
   - **Check:** Title and message display correctly
   - **Check:** Single OK button
   - **Check:** Alert dismisses when tapped

2. **Confirmation Alert**
   - Trigger any confirmation action
   - **Check:** Native iOS alert appears
   - **Check:** Two buttons: Cancel and Confirm
   - **Check:** Destructive actions have red button
   - **Check:** Cancel button on left, confirm on right
   - **Check:** Tapping outside doesn't dismiss

**Priority:** HIGH
**Platform:** iOS

---

### Android Platform

#### Native Alerts

1. **Simple Alert**
   - Trigger any error notification
   - **Check:** Native Android dialog appears
   - **Check:** Title and message display correctly
   - **Check:** Single OK button
   - **Check:** Material Design styling

2. **Confirmation Alert**
   - Trigger any confirmation action
   - **Check:** Native Android dialog appears
   - **Check:** Two buttons: Cancel and Confirm
   - **Check:** Destructive actions have red/warning color
   - **Check:** Cancel button on left, confirm on right
   - **Check:** Back button dismisses (acts as cancel)

**Priority:** HIGH
**Platform:** Android

---

## Priority 3: Accessibility Testing

### Screen Reader Testing

#### Web - NVDA/JAWS/VoiceOver

1. Enable screen reader
2. Trigger success notification
   - **Verify:** Screen reader announces: "[Title] [Message]"
   - **Verify:** Alert role detected
3. Trigger confirmation dialog
   - **Verify:** Focus moves to dialog
   - **Verify:** Title announced
   - **Verify:** Message announced
   - **Verify:** Button labels announced
   - **Verify:** Tab key cycles through buttons
   - **Verify:** ESC key closes dialog

#### iOS - VoiceOver

1. Enable VoiceOver (Settings > Accessibility > VoiceOver)
2. Trigger alert
   - **Verify:** VoiceOver reads title and message
   - **Verify:** Button labels announced clearly
   - **Verify:** Double-tap activates button

#### Android - TalkBack

1. Enable TalkBack (Settings > Accessibility > TalkBack)
2. Trigger alert
   - **Verify:** TalkBack reads title and message
   - **Verify:** Button labels announced clearly
   - **Verify:** Double-tap activates button

**Priority:** MEDIUM
**Platforms:** Web, iOS, Android

---

### Keyboard Navigation (Web)

1. **Confirmation Dialog**
   - Open confirmation dialog
   - **Verify:** Focus is on first button
   - Press Tab
   - **Verify:** Focus moves to second button
   - Press Tab
   - **Verify:** Focus cycles back to first button
   - Press ESC
   - **Verify:** Dialog closes

2. **Multiple Notifications**
   - Trigger 3 notifications rapidly
   - **Verify:** All 3 appear stacked
   - Press Tab
   - **Verify:** Can focus on dismiss buttons
   - Press Enter/Space
   - **Verify:** Notification dismisses

**Priority:** MEDIUM
**Platform:** Web

---

### Touch Target Size

1. **Notification Dismiss Button**
   - **Check:** At least 44x44pt (iOS) or 48x48dp (Android)
   - **Check:** Easy to tap without zooming

2. **Confirmation Dialog Buttons**
   - **Check:** At least 44x44pt (iOS) or 48x48dp (Android)
   - **Check:** Sufficient spacing between buttons
   - **Check:** Easy to tap correct button

**Priority:** HIGH
**Platforms:** iOS, Android, Web

---

## Priority 4: Edge Cases

### Long Messages

1. **Very Long Error Message (200+ characters)**
   - Trigger error with long message
   - **Web:** Check toast expands to fit or scrolls
   - **iOS/Android:** Check alert scrolls if needed
   - **Verify:** Message doesn't get cut off

2. **Long Confirmation Message**
   - **Web:** Check modal scrolls if needed
   - **iOS/Android:** Check alert scrolls if needed
   - **Verify:** Both buttons remain visible

**Priority:** MEDIUM

---

### Special Characters

1. **Quotes in Message**
   - Trigger error: "Can't update user's profile"
   - **Verify:** Displays correctly (no escape characters)

2. **Newlines in Message**
   - Trigger error with multiline message
   - **Verify:** Line breaks render correctly

**Priority:** LOW

---

### Rapid Actions

1. **Multiple Notifications**
   - Quickly trigger 5 notifications
   - **Web:** Check toasts stack correctly
   - **iOS/Android:** Check alerts queue properly
   - **Verify:** No overlapping or missing notifications

2. **Rapid Confirmations**
   - Quickly click delete on 3 items
   - **Verify:** Only one confirmation at a time
   - **Verify:** Each confirmation works independently

**Priority:** MEDIUM

---

### Offline Scenarios

1. **Network Failure**
   - Turn off network
   - Trigger action that requires network
   - **Verify:** Error notification appears
   - **Verify:** Message is helpful: "No network connection. Please check your internet and try again."

2. **Slow Network**
   - Throttle network to slow 3G
   - Trigger action
   - **Verify:** Loading state shows
   - **Verify:** Timeout error if too slow
   - **Verify:** Error message is helpful

**Priority:** LOW

---

## Priority 5: Cross-Browser Testing (Web Only)

Test on the following browsers:

### Desktop

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

### Mobile Web

- ✅ Safari iOS (latest)
- ✅ Chrome Android (latest)

**Test Coverage:**

- Toast notifications appear
- Confirmation modals display
- Auto-dismiss works
- Manual dismiss works
- Styling consistent

**Priority:** LOW

---

## Test Execution Checklist

### Before Testing

- [ ] Review automated test report ([ALERT_REPLACEMENT_TEST_REPORT.md](./ALERT_REPLACEMENT_TEST_REPORT.md))
- [ ] Set up test devices/browsers
- [ ] Create test accounts (customer, technician, admin)
- [ ] Note app version/build number
- [ ] Prepare bug reporting template

### During Testing

- [ ] Complete Priority 1 tests (all platforms)
- [ ] Complete Priority 2 tests (visual validation)
- [ ] Complete Priority 3 tests (accessibility)
- [ ] Complete Priority 4 tests (edge cases)
- [ ] Complete Priority 5 tests (cross-browser)
- [ ] Document all issues found
- [ ] Take screenshots/recordings of issues

### After Testing

- [ ] Create bug reports for issues found
- [ ] Update test report with findings
- [ ] Coordinate with developers on fixes
- [ ] Plan regression testing

---

## Bug Reporting Template

When reporting issues, include:

```markdown
## Bug Report: Alert Replacement Issue

**Title:** [Brief description]

**Priority:** [High/Medium/Low]

**Platform:** [Web/iOS/Android]

**Browser/OS Version:** [If applicable]

**Steps to Reproduce:**

1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Visual Evidence:**
[Screenshot or video]

**Alert Type:**

- [ ] Error notification
- [ ] Success notification
- [ ] Info notification
- [ ] Confirmation dialog

**Related Test Case:**
[Reference from this document]

**Additional Notes:**
[Any other relevant information]
```

---

## Playwright MCP Usage

For complex scenarios requiring Chrome DevTools debugging:

### When to Use Playwright MCP

- Visual regression issues
- JavaScript console errors
- Network timing issues
- Performance problems
- Complex user interactions

### How to Request

Ask the developer to:

```
Use Playwright MCP to debug [specific issue]
- Navigate to [URL/screen]
- Perform [specific action]
- Capture [screenshot/console/network]
```

---

## Test Completion Report

After completing manual QA, provide summary:

```markdown
## Manual QA Summary - Alert Replacements

**Date:** [Date]
**Tester:** [Name]
**Build:** [Version]

### Test Execution

- Priority 1: [Pass/Fail] - [X/Y tests completed]
- Priority 2: [Pass/Fail] - [X/Y tests completed]
- Priority 3: [Pass/Fail] - [X/Y tests completed]
- Priority 4: [Pass/Fail] - [X/Y tests completed]
- Priority 5: [Pass/Fail] - [X/Y tests completed]

### Issues Found

- Critical: [Count]
- High: [Count]
- Medium: [Count]
- Low: [Count]

### Platform Coverage

- Web: [Pass/Fail]
- iOS: [Pass/Fail]
- Android: [Pass/Fail]

### Accessibility

- Screen Reader: [Pass/Fail]
- Keyboard Navigation: [Pass/Fail]
- Touch Targets: [Pass/Fail]

### Recommendation

- [ ] Ready for production
- [ ] Minor fixes needed
- [ ] Major issues require fixing
- [ ] Needs re-testing after fixes
```

---

## Contact

**Test Architect:** Claude Code
**Automated Tests:** `__tests__/alert-replacements/`
**Test Report:** [ALERT_REPLACEMENT_TEST_REPORT.md](./ALERT_REPLACEMENT_TEST_REPORT.md)

For questions about manual QA or to report findings, coordinate with the development team.
