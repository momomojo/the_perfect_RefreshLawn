import { pgTable, text, serial, integer, boolean, timestamp, decimal, date, time } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["provider", "customer"] }).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull()
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  duration: integer("duration").notNull(), // in minutes
  price: decimal("price").notNull(),
  imageUrl: text("image_url").notNull()
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull(),
  customerId: integer("customer_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  status: text("status", { enum: ["pending", "accepted", "completed", "declined"] }).notNull(),
  totalAmount: decimal("total_amount").notNull()
});

// New tables for availability management

export const weeklySchedules = pgTable("weekly_schedules", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isAvailable: boolean("is_available").notNull().default(true)
});

export const blockedDates = pgTable("blocked_dates", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  date: date("date").notNull(),
  reason: text("reason"),
  isFullDay: boolean("is_full_day").notNull().default(true),
  startTime: time("start_time"), // If not full day
  endTime: time("end_time")     // If not full day
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  name: true,
  email: true
});

export const insertServiceSchema = createInsertSchema(services).pick({
  title: true,
  description: true,
  duration: true,
  price: true,
  imageUrl: true
});

export const insertAppointmentSchema = createInsertSchema(appointments).pick({
  serviceId: true,
  startTime: true
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type InsertWeeklySchedule = z.infer<typeof insertWeeklyScheduleSchema>;
export type InsertBlockedDate = z.infer<typeof insertBlockedDateSchema>;

export type User = typeof users.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type WeeklySchedule = typeof weeklySchedules.$inferSelect;
export type BlockedDate = typeof blockedDates.$inferSelect;