/**
 * Booking Status Constants and Helpers
 *
 * Defines constants for the hybrid status system that separates payment tracking
 * from workflow tracking. This allows bookings to have multiple concurrent states
 * (e.g., payment_confirmed + scheduled, or payment_confirmed + in_progress).
 */

// ============================================================================
// PAYMENT STATUS
// ============================================================================

export const PaymentStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export type PaymentStatusType =
  (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusType, string> = {
  [PaymentStatus.PENDING]: 'Payment Pending',
  [PaymentStatus.PROCESSING]: 'Processing Payment',
  [PaymentStatus.CONFIRMED]: 'Payment Confirmed',
  [PaymentStatus.FAILED]: 'Payment Failed',
  [PaymentStatus.REFUNDED]: 'Payment Refunded',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatusType, string> = {
  [PaymentStatus.PENDING]: 'warning', // yellow
  [PaymentStatus.PROCESSING]: 'info', // blue
  [PaymentStatus.CONFIRMED]: 'success', // green
  [PaymentStatus.FAILED]: 'danger', // red
  [PaymentStatus.REFUNDED]: 'muted', // gray
};

// ============================================================================
// WORKFLOW STATUS
// ============================================================================

export const WorkflowStatus = {
  PENDING_ASSIGNMENT: 'pending_assignment',
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type WorkflowStatusType =
  (typeof WorkflowStatus)[keyof typeof WorkflowStatus];

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatusType, string> = {
  [WorkflowStatus.PENDING_ASSIGNMENT]: 'Awaiting Assignment',
  [WorkflowStatus.SCHEDULED]: 'Scheduled',
  [WorkflowStatus.IN_PROGRESS]: 'In Progress',
  [WorkflowStatus.COMPLETED]: 'Completed',
  [WorkflowStatus.CANCELLED]: 'Cancelled',
};

export const WORKFLOW_STATUS_COLORS: Record<WorkflowStatusType, string> = {
  [WorkflowStatus.PENDING_ASSIGNMENT]: 'warning', // yellow
  [WorkflowStatus.SCHEDULED]: 'info', // blue
  [WorkflowStatus.IN_PROGRESS]: 'primary', // purple/blue
  [WorkflowStatus.COMPLETED]: 'success', // green
  [WorkflowStatus.CANCELLED]: 'muted', // gray
};

// ============================================================================
// LEGACY STATUS (for backward compatibility during migration)
// ============================================================================

export const LegacyBookingStatus = {
  // Payment states
  PENDING_PAYMENT: 'pending_payment',
  PAYMENT_PROCESSING: 'payment_processing',
  PAYMENT_CONFIRMED: 'payment_confirmed',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_REFUNDED: 'payment_refunded',

  // Workflow states
  PENDING: 'pending',
  SCHEDULED: 'scheduled',
  RESCHEDULED: 'rescheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;

export type LegacyBookingStatusType =
  (typeof LegacyBookingStatus)[keyof typeof LegacyBookingStatus];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converts legacy status to hybrid status system
 */
export function convertLegacyToHybridStatus(
  legacyStatus: LegacyBookingStatusType
): {
  paymentStatus: PaymentStatusType;
  workflowStatus: WorkflowStatusType;
} {
  switch (legacyStatus) {
    // Payment-related legacy statuses
    case LegacyBookingStatus.PENDING_PAYMENT:
    case LegacyBookingStatus.PAYMENT_PROCESSING:
      return {
        paymentStatus: PaymentStatus.PENDING,
        workflowStatus: WorkflowStatus.PENDING_ASSIGNMENT,
      };

    case LegacyBookingStatus.PAYMENT_CONFIRMED:
      return {
        paymentStatus: PaymentStatus.CONFIRMED,
        workflowStatus: WorkflowStatus.PENDING_ASSIGNMENT,
      };

    case LegacyBookingStatus.PAYMENT_FAILED:
      return {
        paymentStatus: PaymentStatus.FAILED,
        workflowStatus: WorkflowStatus.PENDING_ASSIGNMENT,
      };

    case LegacyBookingStatus.PAYMENT_REFUNDED:
      return {
        paymentStatus: PaymentStatus.REFUNDED,
        workflowStatus: WorkflowStatus.PENDING_ASSIGNMENT,
      };

    // Workflow statuses (payment is implied to be confirmed)
    case LegacyBookingStatus.SCHEDULED:
    case LegacyBookingStatus.RESCHEDULED:
      return {
        paymentStatus: PaymentStatus.CONFIRMED,
        workflowStatus: WorkflowStatus.SCHEDULED,
      };

    case LegacyBookingStatus.IN_PROGRESS:
      return {
        paymentStatus: PaymentStatus.CONFIRMED,
        workflowStatus: WorkflowStatus.IN_PROGRESS,
      };

    case LegacyBookingStatus.COMPLETED:
    case LegacyBookingStatus.NO_SHOW:
      return {
        paymentStatus: PaymentStatus.CONFIRMED,
        workflowStatus: WorkflowStatus.COMPLETED,
      };

    case LegacyBookingStatus.CANCELLED:
      return {
        paymentStatus: PaymentStatus.CONFIRMED,
        workflowStatus: WorkflowStatus.CANCELLED,
      };

    case LegacyBookingStatus.PENDING:
    default:
      return {
        paymentStatus: PaymentStatus.PENDING,
        workflowStatus: WorkflowStatus.PENDING_ASSIGNMENT,
      };
  }
}

/**
 * Gets a combined display label for payment + workflow status
 */
export function getCombinedStatusLabel(
  paymentStatus: PaymentStatusType,
  workflowStatus: WorkflowStatusType
): string {
  // If payment is not confirmed, payment status takes priority
  if (paymentStatus !== PaymentStatus.CONFIRMED) {
    return PAYMENT_STATUS_LABELS[paymentStatus];
  }

  // If payment is confirmed, show workflow status
  return WORKFLOW_STATUS_LABELS[workflowStatus];
}

/**
 * Gets the primary color for a booking based on its hybrid status
 */
export function getCombinedStatusColor(
  paymentStatus: PaymentStatusType,
  workflowStatus: WorkflowStatusType
): string {
  // If payment is not confirmed, payment status determines color
  if (paymentStatus !== PaymentStatus.CONFIRMED) {
    return PAYMENT_STATUS_COLORS[paymentStatus];
  }

  // If payment is confirmed, workflow status determines color
  return WORKFLOW_STATUS_COLORS[workflowStatus];
}

/**
 * Checks if a booking can be assigned to a technician
 */
export function canAssignTechnician(
  paymentStatus: PaymentStatusType,
  workflowStatus: WorkflowStatusType
): boolean {
  return (
    paymentStatus === PaymentStatus.CONFIRMED &&
    workflowStatus === WorkflowStatus.PENDING_ASSIGNMENT
  );
}

/**
 * Checks if a booking can be started (moved to in_progress)
 */
export function canStartJob(
  paymentStatus: PaymentStatusType,
  workflowStatus: WorkflowStatusType
): boolean {
  return (
    paymentStatus === PaymentStatus.CONFIRMED &&
    workflowStatus === WorkflowStatus.SCHEDULED
  );
}

/**
 * Checks if a booking can be completed
 */
export function canCompleteJob(
  paymentStatus: PaymentStatusType,
  workflowStatus: WorkflowStatusType
): boolean {
  return (
    paymentStatus === PaymentStatus.CONFIRMED &&
    workflowStatus === WorkflowStatus.IN_PROGRESS
  );
}

/**
 * Checks if a booking can be cancelled
 */
export function canCancelBooking(
  paymentStatus: PaymentStatusType,
  workflowStatus: WorkflowStatusType
): boolean {
  // Can't cancel if already completed
  if (workflowStatus === WorkflowStatus.COMPLETED) {
    return false;
  }

  // Can't cancel if already cancelled
  if (workflowStatus === WorkflowStatus.CANCELLED) {
    return false;
  }

  // Can cancel in any other state
  return true;
}

/**
 * Checks if a booking job report can be sent
 */
export function canSendJobReport(
  workflowStatus: WorkflowStatusType,
  reportEmailSent: boolean
): boolean {
  return workflowStatus === WorkflowStatus.COMPLETED && !reportEmailSent;
}

/**
 * Gets all possible next workflow statuses from current state
 */
export function getNextWorkflowStatuses(
  currentWorkflowStatus: WorkflowStatusType
): WorkflowStatusType[] {
  switch (currentWorkflowStatus) {
    case WorkflowStatus.PENDING_ASSIGNMENT:
      return [WorkflowStatus.SCHEDULED, WorkflowStatus.CANCELLED];

    case WorkflowStatus.SCHEDULED:
      return [WorkflowStatus.IN_PROGRESS, WorkflowStatus.CANCELLED];

    case WorkflowStatus.IN_PROGRESS:
      return [WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED];

    case WorkflowStatus.COMPLETED:
    case WorkflowStatus.CANCELLED:
      return []; // Terminal states

    default:
      return [];
  }
}

/**
 * Checks if workflow status transition is valid
 */
export function isValidWorkflowTransition(
  fromStatus: WorkflowStatusType,
  toStatus: WorkflowStatusType
): boolean {
  const allowedNext = getNextWorkflowStatuses(fromStatus);
  return allowedNext.includes(toStatus);
}
