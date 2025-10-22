/**
 * Input Validation Schemas using Zod
 *
 * Prevents injection attacks, data corruption, and API abuse by validating
 * all user inputs before processing.
 *
 * This is the CANONICAL source for all validation schemas.
 */

import { z } from 'zod';

// ============================================================================
// COMMON REUSABLE SCHEMAS
// ============================================================================

/** UUID validation */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/** Email validation */
export const emailSchema = z.string().email('Invalid email address').max(255);

/** Phone number validation (flexible international format) */
export const phoneSchema = z
  .string()
  .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format')
  .min(10, 'Phone number too short')
  .max(20, 'Phone number too long')
  .optional();

/** Address validation */
export const addressSchema = z
  .string()
  .min(5, 'Address too short')
  .max(500, 'Address too long')
  .regex(/^[a-zA-Z0-9\s,.\-#]+$/, 'Address contains invalid characters');

/** Notes/comments validation (allows multiline) */
export const notesSchema = z
  .string()
  .max(1000, 'Notes too long (max 1000 characters)')
  .optional()
  .transform((val) => val?.trim());

/** Positive integer validation */
export const positiveIntSchema = z.number().int().positive();

/** Positive amount validation (money in cents) */
export const amountSchema = z
  .number()
  .int('Amount must be an integer (cents)')
  .nonnegative('Amount cannot be negative')
  .max(999999999, 'Amount too large');

/** Date/time string validation */
export const dateTimeSchema = z.string().datetime('Invalid datetime format');

/** Future date validation */
export const futureDateSchema = z
  .string()
  .datetime()
  .refine((date) => new Date(date) > new Date(), {
    message: 'Date must be in the future',
  });

/** URL validation */
export const urlSchema = z.string().url('Invalid URL format').max(500);

// ============================================================================
// BOOKING VALIDATION
// ============================================================================

/** Create booking validation */
export const createBookingSchema = z.object({
  service_id: uuidSchema,
  customer_id: uuidSchema,
  scheduled_date: futureDateSchema,
  address: addressSchema,
  notes: notesSchema,
  estimated_duration_minutes: positiveIntSchema.optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

/** Update booking status validation */
export const updateBookingStatusSchema = z.object({
  booking_id: uuidSchema,
  status: z.enum([
    'pending_payment',
    'payment_processing',
    'payment_confirmed',
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
    'refunded',
  ]),
  notes: notesSchema,
  cancellation_reason: z.string().max(500).optional(),
});

export type UpdateBookingStatusInput = z.infer<
  typeof updateBookingStatusSchema
>;

/** Assign technician validation */
export const assignTechnicianSchema = z.object({
  booking_id: uuidSchema,
  technician_id: uuidSchema,
});

export type AssignTechnicianInput = z.infer<typeof assignTechnicianSchema>;

// ============================================================================
// REVIEW VALIDATION
// ============================================================================

/** Create review validation */
export const createReviewSchema = z.object({
  booking_id: uuidSchema,
  technician_id: uuidSchema,
  customer_id: uuidSchema,
  rating: z.number().int().min(1, 'Rating too low').max(5, 'Rating too high'),
  comment: z
    .string()
    .min(10, 'Review too short (minimum 10 characters)')
    .max(1000, 'Review too long (maximum 1000 characters)')
    .optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

/** Admin feedback on review validation */
export const adminReviewFeedbackSchema = z.object({
  review_id: uuidSchema,
  admin_feedback: z
    .string()
    .min(10, 'Feedback too short (minimum 10 characters)')
    .max(1000, 'Feedback too long (maximum 1000 characters)'),
  admin_id: uuidSchema,
});

export type AdminReviewFeedbackInput = z.infer<
  typeof adminReviewFeedbackSchema
>;

// ============================================================================
// PAYMENT VALIDATION
// ============================================================================

/** Payment intent creation validation */
export const createPaymentIntentSchema = z.object({
  amount: amountSchema,
  currency: z
    .string()
    .length(3, 'Currency must be 3 letters (e.g., USD)')
    .toUpperCase(),
  customer_id: uuidSchema.optional(),
  booking_id: uuidSchema.optional(),
  metadata: z.record(z.string()).optional(),
});

export type CreatePaymentIntentInput = z.infer<
  typeof createPaymentIntentSchema
>;

/** Refund request validation */
export const createRefundRequestSchema = z.object({
  booking_id: uuidSchema,
  reason: z
    .string()
    .min(10, 'Reason too short (minimum 10 characters)')
    .max(500, 'Reason too long (maximum 500 characters)'),
  amount: amountSchema.optional(), // If not provided, full refund
});

export type CreateRefundRequestInput = z.infer<
  typeof createRefundRequestSchema
>;

/** Process refund validation */
export const processRefundSchema = z.object({
  refund_request_id: uuidSchema,
  payment_intent_id: z
    .string()
    .regex(/^pi_[a-zA-Z0-9]+$/, 'Invalid Stripe payment intent ID'),
  amount: amountSchema.optional(),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']),
});

export type ProcessRefundInput = z.infer<typeof processRefundSchema>;

// ============================================================================
// USER/PROFILE VALIDATION
// ============================================================================

/** Update profile validation */
export const updateProfileSchema = z.object({
  user_id: uuidSchema,
  full_name: z
    .string()
    .min(2, 'Name too short')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s\-']+$/, 'Name contains invalid characters')
    .optional(),
  phone: phoneSchema,
  address: addressSchema.optional(),
  avatar_url: urlSchema.optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** Change user role validation (admin only) */
export const changeUserRoleSchema = z.object({
  user_id: uuidSchema,
  new_role: z.enum(['customer', 'technician', 'admin']),
  changed_by: uuidSchema, // Admin user ID
});

export type ChangeUserRoleInput = z.infer<typeof changeUserRoleSchema>;

// ============================================================================
// SERVICE MANAGEMENT VALIDATION
// ============================================================================

/** Create/update service validation */
export const serviceSchema = z.object({
  name: z
    .string()
    .min(3, 'Service name too short')
    .max(100, 'Service name too long')
    .regex(/^[a-zA-Z0-9\s\-&]+$/, 'Service name contains invalid characters'),
  description: z
    .string()
    .min(10, 'Description too short')
    .max(500, 'Description too long'),
  price: amountSchema,
  duration_minutes: positiveIntSchema,
  is_active: z.boolean().default(true),
});

export type ServiceInput = z.infer<typeof serviceSchema>;

// ============================================================================
// TECHNICIAN SCHEDULING VALIDATION
// ============================================================================

/** Technician availability validation */
export const technicianAvailabilitySchema = z
  .object({
    technician_id: uuidSchema,
    day_of_week: z.number().int().min(0, 'Invalid day').max(6, 'Invalid day'),
    start_time: z
      .string()
      .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    end_time: z
      .string()
      .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    is_active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      // Ensure end_time is after start_time
      const [startHour, startMin] = data.start_time.split(':').map(Number);
      const [endHour, endMin] = data.end_time.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      return endMinutes > startMinutes;
    },
    {
      message: 'End time must be after start time',
      path: ['end_time'],
    }
  );

export type TechnicianAvailabilityInput = z.infer<
  typeof technicianAvailabilitySchema
>;

/** Time block (unavailable period) validation */
export const timeBlockSchema = z
  .object({
    technician_id: uuidSchema,
    start_time: dateTimeSchema,
    end_time: dateTimeSchema,
    reason: z.string().max(200, 'Reason too long').optional(),
  })
  .refine((data) => new Date(data.end_time) > new Date(data.start_time), {
    message: 'End time must be after start time',
    path: ['end_time'],
  });

export type TimeBlockInput = z.infer<typeof timeBlockSchema>;

// ============================================================================
// NOTIFICATION VALIDATION
// ============================================================================

/** Send notification validation */
export const sendNotificationSchema = z.object({
  user_id: uuidSchema,
  type: z.enum([
    'booking_confirmed',
    'booking_assigned',
    'booking_updated',
    'booking_cancelled',
    'booking_completed',
    'payment_success',
    'payment_failed',
    'refund_approved',
    'refund_rejected',
    'review_received',
    'system_announcement',
  ]),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  data: z.record(z.string()).optional(),
});

export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;

// ============================================================================
// IMAGE UPLOAD VALIDATION
// ============================================================================

/** Image upload validation */
export const imageUploadSchema = z.object({
  booking_id: uuidSchema,
  image_type: z.enum(['before', 'after']),
  file_name: z
    .string()
    .regex(
      /^[a-zA-Z0-9\-_]+\.(jpg|jpeg|png|webp)$/i,
      'Invalid file name or extension'
    ),
  file_size: z
    .number()
    .int()
    .max(10 * 1024 * 1024, 'File too large (max 10MB)'),
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export type ImageUploadInput = z.infer<typeof imageUploadSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate input against a schema and return typed result
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated and typed data
 * @throws ZodError if validation fails
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data);
}

/**
 * Safely validate input and return result with error handling
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Success object with data or error object with formatted errors
 */
export function safeValidate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format error messages for user-friendly display
  const errors = result.error.errors.map((err) => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });

  return { success: false, errors };
}

/**
 * Validate partial updates (all fields optional)
 * Useful for PATCH endpoints where only some fields are updated
 */
export function createPartialSchema<T extends z.ZodObject<any>>(schema: T) {
  return schema.partial();
}
