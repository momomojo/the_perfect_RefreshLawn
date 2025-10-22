/**
 * Performance Monitoring Utilities
 *
 * Provides helpers for tracking critical user flows and performance metrics
 * using Sentry transactions and custom instrumentation.
 */

import {
  startTransaction,
  addBreadcrumb,
  captureException,
  Sentry,
} from './sentry';

/**
 * Performance monitoring for booking flow
 */
export class BookingFlowMonitor {
  private transaction: any = null;
  private startTime: number = 0;

  start() {
    this.startTime = Date.now();
    this.transaction = startTransaction('booking-flow', 'user-flow');
    addBreadcrumb('Booking flow started', 'navigation');
  }

  async stepServiceSelection(serviceId: string) {
    if (!this.transaction) return;

    const span = this.transaction.startChild({
      op: 'ui.interaction',
      description: 'Select service',
    });

    addBreadcrumb(`Selected service: ${serviceId}`, 'user');

    return () => span.finish();
  }

  async stepDateTimeSelection(date: Date) {
    if (!this.transaction) return;

    const span = this.transaction.startChild({
      op: 'ui.interaction',
      description: 'Select date and time',
    });

    addBreadcrumb(`Selected date: ${date.toISOString()}`, 'user');

    return () => span.finish();
  }

  async stepAddressEntry() {
    if (!this.transaction) return;

    const span = this.transaction.startChild({
      op: 'ui.interaction',
      description: 'Enter address',
    });

    addBreadcrumb('Address entered', 'user');

    return () => span.finish();
  }

  async stepPaymentMethod(method: 'card' | 'cash') {
    if (!this.transaction) return;

    const span = this.transaction.startChild({
      op: 'ui.interaction',
      description: `Payment method: ${method}`,
    });

    addBreadcrumb(`Payment method selected: ${method}`, 'user');

    return () => span.finish();
  }

  success(bookingId: string) {
    if (!this.transaction) return;

    const duration = Date.now() - this.startTime;

    this.transaction.setTag('booking_id', bookingId);
    this.transaction.setTag('status', 'success');
    this.transaction.setMeasurement(
      'booking_duration',
      duration,
      'millisecond'
    );

    addBreadcrumb(`Booking completed: ${bookingId}`, 'info');

    this.transaction.finish();
    this.transaction = null;
  }

  error(error: Error, context?: Record<string, any>) {
    if (!this.transaction) return;

    const duration = Date.now() - this.startTime;

    this.transaction.setTag('status', 'error');
    this.transaction.setMeasurement(
      'booking_duration',
      duration,
      'millisecond'
    );

    if (context) {
      this.transaction.setContext('error_context', context);
    }

    captureException(error, context);

    this.transaction.finish();
    this.transaction = null;
  }

  cancel() {
    if (!this.transaction) return;

    addBreadcrumb('Booking flow cancelled', 'user');
    this.transaction.setTag('status', 'cancelled');
    this.transaction.finish();
    this.transaction = null;
  }
}

/**
 * Performance monitoring for payment flow
 */
export class PaymentFlowMonitor {
  private transaction: any = null;
  private startTime: number = 0;

  start(amount: number, currency: string) {
    this.startTime = Date.now();
    this.transaction = startTransaction('payment-flow', 'payment');

    this.transaction.setTag('payment_amount', amount);
    this.transaction.setTag('payment_currency', currency);

    addBreadcrumb(`Payment flow started: ${amount} ${currency}`, 'payment');
  }

  async stepCreateIntent() {
    if (!this.transaction) return;

    const span = this.transaction.startChild({
      op: 'http.client',
      description: 'Create payment intent',
    });

    return () => span.finish();
  }

  async stepStripeUI() {
    if (!this.transaction) return;

    const span = this.transaction.startChild({
      op: 'ui.render',
      description: 'Render Stripe payment UI',
    });

    return () => span.finish();
  }

  async stepProcessPayment() {
    if (!this.transaction) return;

    const span = this.transaction.startChild({
      op: 'payment.process',
      description: 'Process payment with Stripe',
    });

    return () => span.finish();
  }

  async stepVerifyPayment() {
    if (!this.transaction) return;

    const span = this.transaction.startChild({
      op: 'http.client',
      description: 'Verify payment status',
    });

    return () => span.finish();
  }

  success(paymentIntentId: string) {
    if (!this.transaction) return;

    const duration = Date.now() - this.startTime;

    this.transaction.setTag('payment_intent_id', paymentIntentId);
    this.transaction.setTag('status', 'success');
    this.transaction.setMeasurement(
      'payment_duration',
      duration,
      'millisecond'
    );

    addBreadcrumb(`Payment successful: ${paymentIntentId}`, 'payment');

    this.transaction.finish();
    this.transaction = null;
  }

  error(error: Error, paymentIntentId?: string) {
    if (!this.transaction) return;

    const duration = Date.now() - this.startTime;

    this.transaction.setTag('status', 'error');
    this.transaction.setMeasurement(
      'payment_duration',
      duration,
      'millisecond'
    );

    if (paymentIntentId) {
      this.transaction.setTag('payment_intent_id', paymentIntentId);
    }

    captureException(error, { payment_intent_id: paymentIntentId });

    this.transaction.finish();
    this.transaction = null;
  }

  cancel() {
    if (!this.transaction) return;

    addBreadcrumb('Payment flow cancelled', 'user');
    this.transaction.setTag('status', 'cancelled');
    this.transaction.finish();
    this.transaction = null;
  }
}

/**
 * Performance monitoring for technician workflow
 */
export class TechnicianWorkflowMonitor {
  private transaction: any = null;
  private startTime: number = 0;

  start(bookingId: string) {
    this.startTime = Date.now();
    this.transaction = startTransaction('technician-workflow', 'workflow');

    this.transaction.setTag('booking_id', bookingId);

    addBreadcrumb(`Technician workflow started: ${bookingId}`, 'navigation');
  }

  async stepPhotoUpload(photoType: 'before' | 'after', photoCount: number) {
    if (!this.transaction) return;

    const span = this.transaction.startChild({
      op: 'file.upload',
      description: `Upload ${photoType} photo`,
    });

    this.transaction.setTag(`${photoType}_photo_count`, photoCount);

    addBreadcrumb(`${photoType} photo uploaded`, 'upload');

    return () => span.finish();
  }

  async stepStatusUpdate(newStatus: string) {
    if (!this.transaction) return;

    const span = this.transaction.startChild({
      op: 'http.client',
      description: 'Update booking status',
    });

    addBreadcrumb(`Status updated to: ${newStatus}`, 'info');

    return () => span.finish();
  }

  complete() {
    if (!this.transaction) return;

    const duration = Date.now() - this.startTime;

    this.transaction.setTag('status', 'completed');
    this.transaction.setMeasurement(
      'workflow_duration',
      duration,
      'millisecond'
    );

    addBreadcrumb('Technician workflow completed', 'info');

    this.transaction.finish();
    this.transaction = null;
  }

  error(error: Error) {
    if (!this.transaction) return;

    const duration = Date.now() - this.startTime;

    this.transaction.setTag('status', 'error');
    this.transaction.setMeasurement(
      'workflow_duration',
      duration,
      'millisecond'
    );

    captureException(error);

    this.transaction.finish();
    this.transaction = null;
  }
}

/**
 * Track screen load performance
 */
export function trackScreenLoad(screenName: string) {
  const startTime = Date.now();
  const transaction = startTransaction(
    `screen-load-${screenName}`,
    'navigation'
  );

  return {
    finish: () => {
      const duration = Date.now() - startTime;
      transaction.setMeasurement(
        'screen_load_duration',
        duration,
        'millisecond'
      );
      transaction.finish();

      addBreadcrumb(`Screen loaded: ${screenName}`, 'navigation', {
        duration_ms: duration,
      });
    },
  };
}

/**
 * Track API request performance
 */
export function trackApiRequest(endpoint: string, method: string) {
  const startTime = Date.now();
  const transaction = startTransaction(`api-${method}-${endpoint}`, 'http');

  return {
    success: (statusCode: number) => {
      const duration = Date.now() - startTime;
      transaction.setTag('http.status_code', statusCode);
      transaction.setTag('status', 'success');
      transaction.setMeasurement('request_duration', duration, 'millisecond');
      transaction.finish();
    },
    error: (error: Error, statusCode?: number) => {
      const duration = Date.now() - startTime;
      transaction.setTag('status', 'error');
      if (statusCode) {
        transaction.setTag('http.status_code', statusCode);
      }
      transaction.setMeasurement('request_duration', duration, 'millisecond');
      captureException(error, { endpoint, method });
      transaction.finish();
    },
  };
}
