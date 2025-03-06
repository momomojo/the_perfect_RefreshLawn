import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type User = typeof users.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
