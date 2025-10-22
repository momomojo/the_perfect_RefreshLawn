/**
 * Sentry Integration for RefreshLawn
 *
 * Provides crash reporting, error tracking, and performance monitoring
 * across web, iOS, and Android platforms.
 *
 * Configuration:
 * - Development: Disabled by default (set EXPO_PUBLIC_ENABLE_SENTRY_DEV=true to enable)
 * - Preview/Production: Always enabled
 */

import * as Sentry from 'sentry-expo';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Sentry DSN from environment variables
const SENTRY_DSN =
  'https://beeda164b3ba3e6cad0d06035c6afb12@o4508478973476864.ingest.us.sentry.io/4510217266069504';

// Determine environment
const isDevelopment = __DEV__;
const releaseChannel =
  Constants.expoConfig?.extra?.eas?.channel || 'development';
const appVersion = Constants.expoConfig?.version || '1.0.0';

/**
 * Initialize Sentry for crash reporting and performance monitoring
 */
export function initializeSentry() {
  // Skip Sentry in development unless explicitly enabled
  if (isDevelopment && process.env.EXPO_PUBLIC_ENABLE_SENTRY_DEV !== 'true') {
    console.log('Sentry disabled in development mode');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment information
    environment: releaseChannel,
    release: `refreshlawn@${appVersion}`,
    dist: Platform.OS,

    // Performance monitoring
    enableInExpoDevelopment: false, // Don't trace in development
    tracesSampleRate: releaseChannel === 'production' ? 0.2 : 1.0, // Sample 20% in production, 100% in staging

    // Session tracking
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000, // 30 seconds

    // Integrations
    integrations: [
      new Sentry.Native.ReactNativeTracing({
        // Track navigation performance
        routingInstrumentation:
          new Sentry.Native.ReactNavigationInstrumentation(),

        // Enable automatic tracing of user interactions
        enableUserInteractionTracing: true,

        // Track fetch/XHR requests
        traceFetch: true,
        traceXHR: true,
      }),
    ],

    // Before sending events, add additional context
    beforeSend(event, hint) {
      // In development, log to console instead of sending
      if (isDevelopment) {
        console.log('Sentry Event:', event);
        console.log('Sentry Hint:', hint);
        return null; // Don't send in dev
      }

      // Filter out low-priority errors in production
      if (event.level === 'info' || event.level === 'debug') {
        return null;
      }

      return event;
    },

    // Before sending breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Filter sensitive data from breadcrumbs
      if (breadcrumb.category === 'console') {
        return null; // Don't send console logs
      }

      // Redact sensitive URL parameters
      if (breadcrumb.data?.url) {
        breadcrumb.data.url = redactSensitiveData(breadcrumb.data.url);
      }

      return breadcrumb;
    },

    // Enable native crash reporting
    enableNative: true,
    enableNativeCrashHandling: true,
    enableNativeNagger: false, // Don't show warning about native crashes in dev
  });

  console.log(`Sentry initialized for ${releaseChannel} environment`);
}

/**
 * Set user context for Sentry
 * Call this after user authentication
 */
export function setSentryUser(user: {
  id: string;
  email?: string;
  role?: string;
  name?: string;
}) {
  Sentry.Native.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
    role: user.role,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUser() {
  Sentry.Native.setUser(null);
}

/**
 * Add a breadcrumb for tracking user actions
 */
export function addBreadcrumb(message: string, category: string, data?: any) {
  Sentry.Native.addBreadcrumb({
    message,
    category,
    level: 'info',
    data: data ? redactSensitiveDataFromObject(data) : undefined,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture an exception manually
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.Native.setContext(
      'additional',
      redactSensitiveDataFromObject(context)
    );
  }
  Sentry.Native.captureException(error);
}

/**
 * Capture a message
 */
export function captureMessage(
  message: string,
  level: Sentry.Native.SeverityLevel = 'info'
) {
  Sentry.Native.captureMessage(message, level);
}

/**
 * Start a performance transaction
 * Use for tracking critical user flows
 */
export function startTransaction(name: string, op: string) {
  return Sentry.Native.startTransaction({
    name,
    op,
    trimEnd: true,
  });
}

/**
 * Add tags to Sentry context
 */
export function setTag(key: string, value: string) {
  Sentry.Native.setTag(key, value);
}

/**
 * Redact sensitive data from strings (URLs, etc.)
 */
function redactSensitiveData(str: string): string {
  if (!str) return str;

  // Redact email addresses
  str = str.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[email]');

  // Redact API keys in URLs
  str = str.replace(
    /([?&])(apikey|api_key|key|token|secret)=[^&]*/gi,
    '$1$2=[REDACTED]'
  );

  // Redact Stripe keys
  str = str.replace(/(sk|pk)_(test|live)_[\w]+/g, '$1_$2_[REDACTED]');

  return str;
}

/**
 * Redact sensitive data from objects
 */
function redactSensitiveDataFromObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'cardNumber',
    'card_number',
    'cvv',
    'ssn',
  ];

  const redacted = { ...obj };

  for (const key in redacted) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'string') {
      redacted[key] = redactSensitiveData(redacted[key]);
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitiveDataFromObject(redacted[key]);
    }
  }

  return redacted;
}

// Export Sentry for advanced usage
export { Sentry };
