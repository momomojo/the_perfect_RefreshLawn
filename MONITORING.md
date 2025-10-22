# Production Monitoring Guide

This guide explains how to monitor RefreshLawn in production using Sentry and other tools.

## Sentry Dashboard

### Accessing Sentry

1. Go to https://mohib-hafeez.sentry.io
2. Select project: **refreshlawn**
3. View real-time errors, performance, and releases

### Key Metrics to Monitor

#### Error Rate

- **Target**: < 1% of sessions
- **Alert Threshold**: > 2% of sessions
- **Location**: Issues → Overview

#### Performance

- **P95 Response Time**: < 3 seconds
- **P99 Response Time**: < 5 seconds
- **Location**: Performance → Overview

#### Release Health

- **Crash-Free Sessions**: > 99.5%
- **Crash-Free Users**: > 99.9%
- **Location**: Releases → [Select Release]

## Critical Workflows to Monitor

### 1. Booking Flow

**What to Monitor**:

- Booking completion rate
- Time to complete booking
- Drop-off points (service selection, address entry, payment)

**Sentry Transaction**: `booking-flow`

**Key Metrics**:

```
- booking_duration (target: < 60s)
- Status: success vs. error vs. cancelled
```

**How to Check**:

1. Go to Performance → Transactions
2. Filter by: `transaction:booking-flow`
3. Review duration trends and error rate

### 2. Payment Flow

**What to Monitor**:

- Payment success rate
- Payment processing time
- Failed payment reasons

**Sentry Transaction**: `payment-flow`

**Key Metrics**:

```
- payment_duration (target: < 10s)
- payment_amount
- Status: success vs. error
```

**How to Check**:

1. Go to Performance → Transactions
2. Filter by: `transaction:payment-flow`
3. Check for spikes in errors or duration

### 3. Technician Workflow

**What to Monitor**:

- Photo upload success rate
- Status update completion
- Workflow completion time

**Sentry Transaction**: `technician-workflow`

**Key Metrics**:

```
- workflow_duration
- before_photo_count
- after_photo_count
```

## Stripe Monitoring

### Webhook Health

**Check Webhook Status**:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Select webhook: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
3. View:
   - Success rate (target: > 99%)
   - Recent events
   - Failed deliveries

**Common Webhook Issues**:

- **Authentication errors**: Check `STRIPE_WEBHOOK_SECRET` in Supabase secrets
- **Timeout errors**: Check Edge Function logs
- **Validation errors**: Verify webhook signature validation

### Payment Monitoring

**Key Metrics**:

- Payment success rate (target: > 95%)
- Average transaction value
- Refund rate (target: < 5%)

**How to Check**:

1. Stripe Dashboard → Payments
2. View charts for:
   - Successful payments
   - Failed payments
   - Refunds

**Payment Failure Analysis**:

```sql
-- Query Supabase for failed payments
SELECT
  status,
  COUNT(*) as count,
  AVG(amount) as avg_amount
FROM payments
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

## Supabase Monitoring

### Edge Function Logs

**Using Supabase CLI**:

```bash
# Tail all production logs
npm run logs:prod

# Tail specific function
npm run logs:webhook
npm run logs:payment
```

**Using Supabase Dashboard**:

1. Go to project dashboard
2. Select: Edge Functions
3. Click on function name
4. View logs and invocations

### Database Performance

**Check Query Performance**:

1. Supabase Dashboard → Database → Query Performance
2. Look for:
   - Slow queries (> 1s)
   - High frequency queries
   - Missing indexes

**Monitor Connection Pool**:

1. Database → Settings
2. Check connection pool usage
3. Alert if usage > 80%

### Storage Monitoring

**Check Storage Usage**:

1. Supabase Dashboard → Storage
2. Monitor:
   - Total storage used
   - Upload success rate
   - Bucket access errors

**CORS Issues**:

- Check browser console for CORS errors
- Verify CORS configuration in Storage settings

## Real-time Monitoring

### Live Error Stream

**Sentry Real-time Feed**:

1. Sentry Dashboard → Issues
2. Enable "Real-time" toggle
3. Watch for incoming errors

### Active Users

**Check Active Sessions**:

```sql
-- Query active sessions
SELECT COUNT(DISTINCT user_id) as active_users
FROM auth.sessions
WHERE expires_at > NOW();
```

## Alerting Setup

### Sentry Alerts

**Recommended Alerts**:

1. **High Error Rate**
   - Condition: Error rate > 2%
   - Action: Email + Slack notification
   - Frequency: Immediately

2. **Performance Degradation**
   - Condition: P95 response time > 5s
   - Action: Email team
   - Frequency: Every 30 minutes

3. **New Release Issues**
   - Condition: New release crash rate > 1%
   - Action: Email + Slack notification
   - Frequency: Immediately

**Setting Up Alerts**:

1. Sentry → Settings → Alerts
2. Create Alert Rule
3. Configure conditions and actions
4. Test alert

### Stripe Webhook Alerts

**Webhook Failure Alert**:

1. Stripe Dashboard → Developers → Webhooks
2. Click on webhook
3. Configure notifications:
   - Email on failures
   - Threshold: 3 consecutive failures

## Debugging Production Issues

### Investigating Errors

**Step 1: Identify the Issue**

1. Go to Sentry → Issues
2. Sort by: Most frequent or Most recent
3. Click on issue to view details

**Step 2: Review Context**

- **Breadcrumbs**: User actions leading to error
- **Tags**: Environment, user role, screen
- **Context**: Request data, user info
- **Stack Trace**: Code path to error

**Step 3: Reproduce**

1. Note environment (iOS/Android/Web)
2. Note user role and state
3. Follow breadcrumbs to reproduce
4. Check if issue exists in staging

**Step 4: Fix & Deploy**

1. Create hotfix branch
2. Implement fix
3. Test locally
4. Deploy via OTA update (if JS/asset change):
   ```bash
   npm run update:prod "Fix: [Issue description]"
   ```
5. Or submit new build (if native change)

### Performance Investigation

**Identifying Slow Screens**:

1. Sentry → Performance → Screens
2. Sort by: P95 duration
3. Click on slow screen
4. Review:
   - Component render times
   - API call durations
   - Database query times

**Optimizing Performance**:

- Add React.memo() to slow components
- Implement pagination for large lists
- Add database indexes for slow queries
- Optimize images (compress, resize)

## Regular Maintenance Tasks

### Daily

- [ ] Check Sentry for new critical errors
- [ ] Review Stripe payment success rate
- [ ] Monitor Edge Function error rate

### Weekly

- [ ] Review performance trends
- [ ] Analyze user flow drop-offs
- [ ] Check for slow database queries
- [ ] Review storage usage

### Monthly

- [ ] Security audit (dependency updates)
- [ ] Performance optimization review
- [ ] Cost analysis (Supabase, Stripe, Sentry)
- [ ] User feedback review

## Dashboard Links

Quick access to monitoring dashboards:

- **Sentry**: https://mohib-hafeez.sentry.io/projects/refreshlawn/
- **Stripe**: https://dashboard.stripe.com/payments
- **Supabase**: https://supabase.com/dashboard/project/YOUR_PROJECT_REF
- **EAS**: https://expo.dev/accounts/YOUR_ACCOUNT/projects/refreshlawn

## Emergency Contacts

Document emergency contact information:

```
Technical Lead: _______________
On-Call Engineer: _______________
Stripe Support: https://support.stripe.com
Supabase Support: support@supabase.io
Sentry Support: support@sentry.io
```

## Incident Response

### Severity Levels

**P0 - Critical**

- App crashes on launch
- Payment processing completely broken
- Data loss or corruption
- **Response Time**: Immediate

**P1 - High**

- Feature completely broken for all users
- Significant performance degradation
- Security vulnerability
- **Response Time**: < 1 hour

**P2 - Medium**

- Feature broken for some users
- Minor performance issues
- Non-critical bugs
- **Response Time**: < 4 hours

**P3 - Low**

- UI glitches
- Minor bugs with workarounds
- Feature requests
- **Response Time**: Next business day

### Incident Response Steps

1. **Detect**: Monitoring alert or user report
2. **Assess**: Determine severity level
3. **Communicate**: Notify stakeholders
4. **Investigate**: Use monitoring tools to diagnose
5. **Mitigate**: Deploy hotfix or rollback
6. **Verify**: Confirm issue is resolved
7. **Document**: Post-mortem and lessons learned

## Advanced Monitoring

### Custom Metrics

Add custom tracking for business metrics:

```typescript
import { captureMessage } from './lib/sentry';

// Track business event
captureMessage('booking_confirmed', 'info');

// Track with context
captureMessage('payment_successful', 'info', {
  amount: 1000,
  currency: 'USD',
  user_id: 'user_123',
});
```

### User Feedback

Collect user feedback on errors:

```typescript
import { Sentry } from './lib/sentry';

// Show feedback form on error
Sentry.Native.captureUserFeedback({
  event_id: eventId,
  name: userName,
  email: userEmail,
  comments: userComments,
});
```

---

For questions or issues, contact the development team or refer to:

- [Sentry Documentation](https://docs.sentry.io/)
- [Stripe Monitoring Guide](https://stripe.com/docs/monitoring)
- [Supabase Observability](https://supabase.com/docs/guides/platform/logs)
