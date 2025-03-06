import { users, services, appointments, weeklySchedules, blockedDates, type User, type Service, type Appointment, type WeeklySchedule, type BlockedDate, type InsertUser, type InsertService, type InsertAppointment, type InsertWeeklySchedule, type InsertBlockedDate } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Service operations  
  createService(service: InsertService, providerId: number): Promise<Service>;
  getService(id: number): Promise<Service | undefined>;
  getProviderServices(providerId: number): Promise<Service[]>;
  getAllServices(): Promise<Service[]>;

  // Appointment operations
  createAppointment(appointment: InsertAppointment, customerId: number): Promise<Appointment>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  getCustomerAppointments(customerId: number): Promise<Appointment[]>;
  getProviderAppointments(providerId: number): Promise<Appointment[]>;
  updateAppointmentStatus(id: number, status: "accepted" | "completed" | "declined"): Promise<Appointment>;

  // Weekly Schedule operations
  createWeeklySchedule(schedule: InsertWeeklySchedule, providerId: number): Promise<WeeklySchedule>;
  getProviderWeeklySchedules(providerId: number): Promise<WeeklySchedule[]>;
  updateWeeklySchedule(id: number, schedule: Partial<InsertWeeklySchedule>): Promise<WeeklySchedule>;
  deleteWeeklySchedule(id: number): Promise<void>;

  // Blocked Date operations
  createBlockedDate(blockedDate: InsertBlockedDate, providerId: number): Promise<BlockedDate>;
  getProviderBlockedDates(providerId: number): Promise<BlockedDate[]>;
  getBlockedDatesByDateRange(providerId: number, startDate: Date, endDate: Date): Promise<BlockedDate[]>;
  updateBlockedDate(id: number, blockedDate: Partial<InsertBlockedDate>): Promise<BlockedDate>;
  deleteBlockedDate(id: number): Promise<void>;

  // Check availability
  isTimeSlotAvailable(providerId: number, date: Date, startTime: string, endTime: string): Promise<boolean>;

  sessionStore: any; // Use any type to avoid conflicts with session.SessionStore
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createService(service: InsertService, providerId: number): Promise<Service> {
    const [newService] = await db
      .insert(services)
      .values({ ...service, providerId })
      .returning();
    return newService;
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async getProviderServices(providerId: number): Promise<Service[]> {
    return await db
      .select()
      .from(services)
      .where(eq(services.providerId, providerId));
  }

  async getAllServices(): Promise<Service[]> {
    return await db.select().from(services);
  }

  async createAppointment(appointment: InsertAppointment, customerId: number): Promise<Appointment> {
    const service = await this.getService(appointment.serviceId);
    if (!service) throw new Error("Service not found");

    // Convert startTime from string to Date if it's a string
    let startTimeValue: Date;
    if (typeof appointment.startTime === 'string') {
      startTimeValue = new Date(appointment.startTime);
    } else {
      startTimeValue = appointment.startTime;
    }

    const [newAppointment] = await db
      .insert(appointments)
      .values({
        serviceId: appointment.serviceId,
        customerId,
        status: "pending",
        totalAmount: service.price,
        address: appointment.address,
        specialInstructions: appointment.specialInstructions,
        startTime: startTimeValue
      })
      .returning();
    return newAppointment;
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));
    return appointment;
  }

  async getCustomerAppointments(customerId: number): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.customerId, customerId));
  }

  async getProviderAppointments(providerId: number): Promise<Appointment[]> {
    const providerServices = await this.getProviderServices(providerId);
    const serviceIds = providerServices.map(s => s.id);

    if (serviceIds.length === 0) {
      return [];
    }

    return await db
      .select()
      .from(appointments)
      .where(inArray(appointments.serviceId, serviceIds));
  }

  async updateAppointmentStatus(id: number, status: "accepted" | "completed" | "declined"): Promise<Appointment> {
    const [appointment] = await db
      .update(appointments)
      .set({ status })
      .where(eq(appointments.id, id))
      .returning();

    if (!appointment) throw new Error("Appointment not found");
    return appointment;
  }

  // Weekly Schedule operations
  async createWeeklySchedule(schedule: InsertWeeklySchedule, providerId: number): Promise<WeeklySchedule> {
    const [newSchedule] = await db
      .insert(weeklySchedules)
      .values({ ...schedule, providerId })
      .returning();
    return newSchedule;
  }

  async getProviderWeeklySchedules(providerId: number): Promise<WeeklySchedule[]> {
    return await db
      .select()
      .from(weeklySchedules)
      .where(eq(weeklySchedules.providerId, providerId));
  }

  async updateWeeklySchedule(id: number, schedule: Partial<InsertWeeklySchedule>): Promise<WeeklySchedule> {
    const [updatedSchedule] = await db
      .update(weeklySchedules)
      .set(schedule)
      .where(eq(weeklySchedules.id, id))
      .returning();

    if (!updatedSchedule) throw new Error("Schedule not found");
    return updatedSchedule;
  }

  async deleteWeeklySchedule(id: number): Promise<void> {
    await db
      .delete(weeklySchedules)
      .where(eq(weeklySchedules.id, id));
  }

  // Blocked Date operations
  async createBlockedDate(blockedDate: InsertBlockedDate, providerId: number): Promise<BlockedDate> {
    const [newBlockedDate] = await db
      .insert(blockedDates)
      .values({ ...blockedDate, providerId })
      .returning();
    return newBlockedDate;
  }

  async getProviderBlockedDates(providerId: number): Promise<BlockedDate[]> {
    return await db
      .select()
      .from(blockedDates)
      .where(eq(blockedDates.providerId, providerId));
  }

  async getBlockedDatesByDateRange(providerId: number, startDate: Date, endDate: Date): Promise<BlockedDate[]> {
    return await db
      .select()
      .from(blockedDates)
      .where(
        and(
          eq(blockedDates.providerId, providerId),
          gte(blockedDates.date, startDate.toISOString().split('T')[0]),
          lte(blockedDates.date, endDate.toISOString().split('T')[0])
        )
      );
  }

  async updateBlockedDate(id: number, blockedDate: Partial<InsertBlockedDate>): Promise<BlockedDate> {
    const [updatedBlockedDate] = await db
      .update(blockedDates)
      .set(blockedDate)
      .where(eq(blockedDates.id, id))
      .returning();

    if (!updatedBlockedDate) throw new Error("Blocked date not found");
    return updatedBlockedDate;
  }

  async deleteBlockedDate(id: number): Promise<void> {
    await db
      .delete(blockedDates)
      .where(eq(blockedDates.id, id));
  }

  // Check availability
  async isTimeSlotAvailable(providerId: number, date: Date, startTime: string, endTime: string): Promise<boolean> {
    // Check if there's a blocked date for this day
    const dateOnly = date.toISOString().split('T')[0];
    const blockedDatesForDay = await db
      .select()
      .from(blockedDates)
      .where(
        and(
          eq(blockedDates.providerId, providerId),
          eq(blockedDates.date, dateOnly)
        )
      );

    // Check for full day blocks
    if (blockedDatesForDay.some(block => block.isFullDay)) {
      return false;
    }

    // Check for partial day blocks
    for (const block of blockedDatesForDay) {
      if (block.startTime && block.endTime) {
        // Check if requested time overlaps with any blocked time
        if ((startTime >= block.startTime && startTime < block.endTime) || 
            (endTime > block.startTime && endTime <= block.endTime) ||
            (startTime <= block.startTime && endTime >= block.endTime)) {
          return false;
        }
      }
    }

    // Check weekly schedule
    const dayOfWeek = date.getDay();
    const schedules = await db
      .select()
      .from(weeklySchedules)
      .where(
        and(
          eq(weeklySchedules.providerId, providerId),
          eq(weeklySchedules.dayOfWeek, dayOfWeek)
        )
      );

    // If no schedules or none are available, time slot is not available
    if (schedules.length === 0 || !schedules.some(s => s.isAvailable)) {
      return false;
    }

    // Check if requested time is within any available schedule
    for (const schedule of schedules) {
      if (schedule.isAvailable && 
          startTime >= schedule.startTime && 
          endTime <= schedule.endTime) {
        return true;
      }
    }

    // If we get here, the time is not within any available schedule
    return false;
  }
}

export const storage = new DatabaseStorage();