# Production Deployment Checklist

Complete this checklist before deploying RefreshLawn to production.

## Environment Configuration

### Required Environment Variables

- [ ] `EXPO_PUBLIC_SUPABASE_URL` - Production Supabase URL
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Production Supabase anon key
- [ ] `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Production Stripe publishable key
- [ ] `SENTRY_AUTH_TOKEN` - Sentry auth token for source map uploads
- [ ] `SENTRY_ORG` - Sentry organization (mohib-hafeez)
- [ ] `SENTRY_PROJECT` - Sentry project (refreshlawn)

### EAS Secrets Configuration

```bash
# Add secrets to EAS (run these commands)
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value YOUR_VALUE
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value YOUR_VALUE
eas secret:create --scope project --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value YOUR_VALUE
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value YOUR_VALUE
```

## Supabase Configuration

- [ ] Production database created
- [ ] All migrations applied
- [ ] RLS policies tested for each role (customer, technician, admin)
- [ ] Edge functions deployed: `stripe-payment-api`, `stripe-webhook`, `stripe-customer-api`
- [ ] Storage buckets configured with proper CORS and RLS
- [ ] Auth providers configured (email/password)
- [ ] Custom JWT claims working

### Verify Supabase Setup

```bash
# Check project status
supabase projects list

# Verify edge functions
supabase functions list --project-ref YOUR_PROJECT_REF
```

## Stripe Configuration

- [ ] Live mode API keys configured
- [ ] Webhook endpoint registered: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
- [ ] Webhook secret saved as `STRIPE_WEBHOOK_SECRET` in Supabase secrets
- [ ] Test payments completed successfully
- [ ] Refund flow tested
- [ ] Payment method saving tested

### Verify Stripe Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Ensure webhook is registered and receiving events
3. Test with Stripe test cards first, then live mode

## Sentry Configuration

- [ ] Sentry project created (refreshlawn)
- [ ] DSN added to environment variables
- [ ] Source maps uploading correctly (check after first build)
- [ ] Error alerts configured (Slack/email)
- [ ] Performance monitoring enabled
- [ ] Release tracking configured

### Verify Sentry Setup

1. Trigger a test error: `throw new Error('Sentry test');`
2. Check Sentry dashboard for the error
3. Verify source maps show correct line numbers

## App Store Submission

### iOS (Apple App Store)

- [ ] Apple Developer account active
- [ ] App ID created: `com.lawnrefresh.app`
- [ ] App Store Connect app created
- [ ] Privacy policy URL added
- [ ] Terms of service URL added
- [ ] App screenshots prepared (all required sizes)
- [ ] App description written
- [ ] Keywords optimized
- [ ] Age rating selected
- [ ] IAP configuration (if applicable)

### Android (Google Play Store)

- [ ] Google Play Console account active
- [ ] App ID created: `com.lawnrefresh.app`
- [ ] Service account key generated
- [ ] Privacy policy URL added
- [ ] Content rating questionnaire completed
- [ ] App screenshots prepared (all required sizes)
- [ ] Feature graphic created
- [ ] Store listing description written
- [ ] App signing configured (Google Play App Signing recommended)

## Testing

- [ ] Unit tests passing (`npm run test:ci`)
- [ ] E2E tests passing (`npm run test:e2e`)
- [ ] Lint checks passing (`npm run lint`)
- [ ] Code formatting verified (`npm run format:check`)
- [ ] Manual testing completed on iOS device
- [ ] Manual testing completed on Android device
- [ ] Manual testing completed on web browser
- [ ] Payment flow tested end-to-end
- [ ] Booking flow tested end-to-end
- [ ] Role-based access control verified (customer, technician, admin)
- [ ] Notifications working correctly
- [ ] Image uploads working (before/after photos)
- [ ] Real-time updates verified

## Build & Deployment

- [ ] Production build completed: `eas build --profile production`
- [ ] Build successful for iOS
- [ ] Build successful for Android
- [ ] TestFlight/Internal testing completed
- [ ] App submitted to Apple App Store
- [ ] App submitted to Google Play Store

## Post-Deployment

- [ ] Monitor Sentry for errors in first 24 hours
- [ ] Check server logs for any issues
- [ ] Verify Stripe webhooks are being received
- [ ] Test OTA updates: `npm run update:prod "Test update"`
- [ ] Set up monitoring dashboards
- [ ] Document any production-specific configurations
- [ ] Create incident response plan

## Rollback Plan

If issues occur in production:

1. **Immediate**: Publish OTA update to revert changes (if JS/asset change)

   ```bash
   npm run update:prod "Rollback to previous version"
   ```

2. **Critical Native Issues**: Submit new build with fixes
   - Emergency fix PR
   - Fast-track review through EAS Build
   - Contact app stores for expedited review

3. **Database Issues**: Have migration rollback scripts ready
   - Keep backups before each migration
   - Document all schema changes

## Monitoring & Alerts

- [ ] Sentry alerts configured for error rate spikes
- [ ] Performance degradation alerts set up
- [ ] Uptime monitoring for Supabase Edge Functions
- [ ] Stripe webhook failure alerts
- [ ] Database connection pool monitoring

## Security

- [ ] All API keys rotated from development keys
- [ ] No test/development keys in production
- [ ] RLS policies audited for security holes
- [ ] Auth tokens have proper expiration
- [ ] Rate limiting configured on Edge Functions
- [ ] CORS properly configured
- [ ] SSL/TLS certificates valid

## Compliance

- [ ] Privacy policy published and accessible
- [ ] Terms of service published and accessible
- [ ] GDPR compliance verified (if applicable)
- [ ] CCPA compliance verified (if applicable)
- [ ] Data retention policies documented
- [ ] User data deletion process implemented

## Success Metrics

Define success metrics to track after launch:

- [ ] Daily Active Users (DAU)
- [ ] Booking conversion rate
- [ ] Payment success rate
- [ ] App crash rate (target: <1%)
- [ ] Average screen load time (target: <3s)
- [ ] Customer satisfaction score

---

## Notes

Document any production-specific notes, issues, or configurations here:

```
[Add notes as needed]
```

## Sign-off

- [ ] Technical lead reviewed
- [ ] Product owner approved
- [ ] QA sign-off received
- [ ] Security review completed

**Deployment Date**: ******\_******
**Deployed By**: ******\_******
**Version**: ******\_******
