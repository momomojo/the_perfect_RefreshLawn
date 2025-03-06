import { pgTable, text, serial, integer, boolean, timestamp, decimal, date, time } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["provider", "customer"] }).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  address: text("address") // Added address field to users
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  duration: integer("duration").notNull(), // in minutes
  price: decimal("price").notNull(),
  imageUrl: text("image_url").notNull(),
  bufferTime: integer("buffer_time").default(0), // minutes required between appointments
  maxDailyBookings: integer("max_daily_bookings"), // maximum appointments per day
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull(),
  customerId: integer("customer_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  status: text("status", { 
    enum: [
      "pending",      // Initial state when customer books
      "accepted",     // Provider accepted the booking
      "confirmed",    // Provider confirmed they're on their way
      "in_progress",  // Provider started the service
      "completed",    // Service is done
      "cancelled",    // Cancelled by either party
      "declined"      // Provider declined the booking
    ] 
  }).notNull(),
  totalAmount: decimal("total_amount").notNull(),
  address: text("address").notNull(), // Address field
  specialInstructions: text("special_instructions"), // Special instructions field
  completionNotes: text("completion_notes"), // Notes added by provider upon completion
  recurring: boolean("recurring").default(false), // For recurring appointments
  recurringInterval: text("recurring_interval"), // weekly, biweekly, monthly
  nextRecurringDate: timestamp("next_recurring_date")
});

// Weekly Schedule for providers
export const weeklySchedules = pgTable("weekly_schedules", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isAvailable: boolean("is_available").notNull().default(true)
});

// Blocked dates for providers
export const blockedDates = pgTable("blocked_dates", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  date: date("date").notNull(),
  reason: text("reason"),
  isFullDay: boolean("is_full_day").notNull().default(true),
  startTime: time("start_time"), // If not full day
  endTime: time("end_time")     // If not full day
});

// New table for break times
export const breakTimes = pgTable("break_times", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  reason: text("reason") // Optional reason for the break
});

// New table for waitlist entries
export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull(),
  customerId: integer("customer_id").notNull(),
  preferredDate: date("preferred_date").notNull(),
  preferredTimeRange: text("preferred_time_range").notNull(), // e.g., "morning", "afternoon", "evening"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  status: text("status", { enum: ["active", "fulfilled", "expired"] }).notNull(),
  notificationSent: boolean("notification_sent").default(false)
});

// Schema for creating new entries
export const insertUserSchema = createInsertSchema(users);
export const insertServiceSchema = createInsertSchema(services).pick({
  title: true,
  description: true,
  duration: true,
  price: true,
  imageUrl: true,
  bufferTime: true,
  maxDailyBookings: true
});

// Modify the appointment schema to accept a string for startTime
export const insertAppointmentSchema = createInsertSchema(appointments)
  .pick({
    serviceId: true,
    address: true,
    specialInstructions: true
  })
  .extend({
    // Override the startTime field to accept string (ISO format)
    startTime: z.string().refine(
      (val) => !isNaN(Date.parse(val)),
      { message: "Invalid date format. Please provide a valid ISO date string." }
    )
  });

export const insertWeeklyScheduleSchema = createInsertSchema(weeklySchedules).pick({
  dayOfWeek: true,
  startTime: true,
  endTime: true,
  isAvailable: true
});

export const insertBlockedDateSchema = createInsertSchema(blockedDates).pick({
  date: true,
  reason: true,
  isFullDay: true,
  startTime: true,
  endTime: true
});

export const insertBreakTimeSchema = createInsertSchema(breakTimes).pick({
  dayOfWeek: true,
  startTime: true,
  endTime: true,
  reason: true
});

export const insertWaitlistSchema = createInsertSchema(waitlist).pick({
  serviceId: true,
  preferredDate: true,
  preferredTimeRange: true
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type InsertWeeklySchedule = z.infer<typeof insertWeeklyScheduleSchema>;
export type InsertBlockedDate = z.infer<typeof insertBlockedDateSchema>;
export type InsertBreakTime = z.infer<typeof insertBreakTimeSchema>;
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;

export type User = typeof users.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type WeeklySchedule = typeof weeklySchedules.$inferSelect;
export type BlockedDate = typeof blockedDates.$inferSelect;
export type BreakTime = typeof breakTimes.$inferSelect;
export type Waitlist = typeof waitlist.$inferSelect;