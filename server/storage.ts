import { users, services, appointments, weeklySchedules, blockedDates, breakTimes, waitlist, type User, type Service, type Appointment, type WeeklySchedule, type BlockedDate, type BreakTime, type Waitlist, type InsertUser, type InsertService, type InsertAppointment, type InsertWeeklySchedule, type InsertBlockedDate, type InsertBreakTime, type InsertWaitlist } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
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
  updateAppointmentStatus(
    id: number, 
    status: "accepted" | "confirmed" | "in_progress" | "completed" | "cancelled" | "declined",
    notes?: string
  ): Promise<Appointment>;

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

  // Break time operations
  createBreakTime(breakTime: InsertBreakTime, providerId: number): Promise<BreakTime>;
  getProviderBreakTimes(providerId: number): Promise<BreakTime[]>;
  updateBreakTime(id: number, breakTime: Partial<InsertBreakTime>): Promise<BreakTime>;
  deleteBreakTime(id: number): Promise<void>;

  // Waitlist operations
  addToWaitlist(waitlistEntry: InsertWaitlist, customerId: number): Promise<Waitlist>;
  getCustomerWaitlistEntries(customerId: number): Promise<Waitlist[]>;
  getServiceWaitlistEntries(serviceId: number): Promise<Waitlist[]>;
  updateWaitlistStatus(id: number, status: "fulfilled" | "expired"): Promise<Waitlist>;

  createRecurringAppointment(
    appointment: InsertAppointment, 
    customerId: number,
    recurringInterval: "weekly" | "biweekly" | "monthly"
  ): Promise<Appointment>;

  getNextRecurringDate(
    currentDate: Date,
    interval: "weekly" | "biweekly" | "monthly"
  ): Promise<Date>;

  // Check availability with enhanced rules
  isTimeSlotAvailable(
    providerId: number,
    date: Date,
    startTime: string,
    endTime: string,
    serviceId: number
  ): Promise<boolean>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

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

    // Calculate end time based on service duration
    const endTimeValue = new Date(startTimeValue);
    endTimeValue.setMinutes(endTimeValue.getMinutes() + service.duration);

    // Format times for availability check
    const startTimeStr = startTimeValue.toLocaleTimeString('en-US', { hour12: false });
    const endTimeStr = endTimeValue.toLocaleTimeString('en-US', { hour12: false });

    // Check availability within a transaction to prevent race conditions
    return await db.transaction(async (tx) => {
      const isAvailable = await this.isTimeSlotAvailable(
        service.providerId,
        startTimeValue,
        startTimeStr,
        endTimeStr,
        service.id
      );

      if (!isAvailable) {
        throw new Error("This time slot is no longer available");
      }

      const [newAppointment] = await tx
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
    });
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));
    return appointment;
  }

  async getCustomerAppointments(customerId: number): Promise<Appointment[]> {
    // First verify that the customer exists
    const customer = await this.getUser(customerId);
    if (!customer) throw new Error("Customer not found");

    // Get all appointments for this customer with proper filtering
    const appointments = await db
      .select({
        id: appointments.id,
        serviceId: appointments.serviceId,
        customerId: appointments.customerId,
        status: appointments.status,
        startTime: appointments.startTime,
        totalAmount: appointments.totalAmount,
        address: appointments.address,
        specialInstructions: appointments.specialInstructions,
        completionNotes: appointments.completionNotes,
        recurring: appointments.recurring,
        recurringInterval: appointments.recurringInterval,
        nextRecurringDate: appointments.nextRecurringDate
      })
      .from(appointments)
      .where(eq(appointments.customerId, customerId));

    return appointments;
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
      .where(
        inArray(appointments.serviceId, serviceIds)
      );
  }

  async updateAppointmentStatus(
    id: number,
    status: "accepted" | "confirmed" | "in_progress" | "completed" | "cancelled" | "declined",
    notes?: string
  ): Promise<Appointment> {
    // Verify the appointment exists
    const appointment = await this.getAppointment(id);
    if (!appointment) throw new Error("Appointment not found");

    // Use transaction to ensure data consistency
    const [updatedAppointment] = await db
      .update(appointments)
      .set({
        status,
        ...(notes && status === "completed" ? { completionNotes: notes } : {})
      })
      .where(eq(appointments.id, id))
      .returning();

    if (!updatedAppointment) throw new Error("Failed to update appointment");
    return updatedAppointment;
  }

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

  async createBreakTime(breakTime: InsertBreakTime, providerId: number): Promise<BreakTime> {
    const [newBreakTime] = await db
      .insert(breakTimes)
      .values({ ...breakTime, providerId })
      .returning();
    return newBreakTime;
  }

  async getProviderBreakTimes(providerId: number): Promise<BreakTime[]> {
    return await db
      .select()
      .from(breakTimes)
      .where(eq(breakTimes.providerId, providerId));
  }

  async updateBreakTime(id: number, breakTime: Partial<InsertBreakTime>): Promise<BreakTime> {
    const [updatedBreakTime] = await db
      .update(breakTimes)
      .set(breakTime)
      .where(eq(breakTimes.id, id))
      .returning();

    if (!updatedBreakTime) throw new Error("Break time not found");
    return updatedBreakTime;
  }

  async deleteBreakTime(id: number): Promise<void> {
    await db
      .delete(breakTimes)
      .where(eq(breakTimes.id, id));
  }

  async addToWaitlist(waitlistEntry: InsertWaitlist, customerId: number): Promise<Waitlist> {
    const [newEntry] = await db
      .insert(waitlist)
      .values({
        ...waitlistEntry,
        customerId,
        status: "active",
        createdAt: new Date()
      })
      .returning();
    return newEntry;
  }

  async getCustomerWaitlistEntries(customerId: number): Promise<Waitlist[]> {
    return await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.customerId, customerId));
  }

  async getServiceWaitlistEntries(serviceId: number): Promise<Waitlist[]> {
    return await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.serviceId, serviceId));
  }

  async updateWaitlistStatus(id: number, status: "fulfilled" | "expired"): Promise<Waitlist> {
    const [entry] = await db
      .update(waitlist)
      .set({ status, notificationSent: true })
      .where(eq(waitlist.id, id))
      .returning();

    if (!entry) throw new Error("Waitlist entry not found");
    return entry;
  }

  async createRecurringAppointment(
    appointment: InsertAppointment,
    customerId: number,
    recurringInterval: "weekly" | "biweekly" | "monthly"
  ): Promise<Appointment> {
    const service = await this.getService(appointment.serviceId);
    if (!service) throw new Error("Service not found");

    let startTimeValue: Date;
    if (typeof appointment.startTime === 'string') {
      startTimeValue = new Date(appointment.startTime);
    } else {
      startTimeValue = appointment.startTime;
    }

    const nextRecurringDate = await this.getNextRecurringDate(startTimeValue, recurringInterval);

    const [newAppointment] = await db
      .insert(appointments)
      .values({
        serviceId: appointment.serviceId,
        customerId,
        status: "pending",
        totalAmount: service.price,
        address: appointment.address,
        specialInstructions: appointment.specialInstructions,
        startTime: startTimeValue,
        recurring: true,
        recurringInterval,
        nextRecurringDate
      })
      .returning();

    return newAppointment;
  }

  async getNextRecurringDate(
    currentDate: Date,
    interval: "weekly" | "biweekly" | "monthly"
  ): Promise<Date> {
    const nextDate = new Date(currentDate);

    switch (interval) {
      case "weekly":
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case "biweekly":
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }

    return nextDate;
  }

  async isTimeSlotAvailable(
    providerId: number,
    date: Date,
    startTime: string,
    endTime: string,
    serviceId: number
  ): Promise<boolean> {
    // Get the service to check duration and buffer time
    const service = await this.getService(serviceId);
    if (!service) return false;

    // Check if there's a blocked date for this day
    const dateOnly = date.toISOString().split('T')[0];
    const [blockedDate] = await db
      .select()
      .from(blockedDates)
      .where(
        and(
          eq(blockedDates.providerId, providerId),
          eq(blockedDates.date, dateOnly)
        )
      );

    if (blockedDate) {
      if (blockedDate.isFullDay) return false;

      if (blockedDate.startTime && blockedDate.endTime) {
        const blockedStart = blockedDate.startTime;
        const blockedEnd = blockedDate.endTime;

        if (startTime >= blockedStart && startTime < blockedEnd) return false;
        if (endTime > blockedStart && endTime <= blockedEnd) return false;
      }
    }

    // Check if there are any overlapping appointments for this day
    const existingAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.serviceId, serviceId),
          sql`DATE(${appointments.startTime}) = ${dateOnly}`
        )
      );

    if (existingAppointments.length > 0) {
      // Get service duration in milliseconds
      const durationMs = service.duration * 60 * 1000;
      const bufferMs = (service.bufferTime || 0) * 60 * 1000;

      // Convert request times to milliseconds since midnight
      const requestStart = this.parseTimeToMs(startTime);
      const requestEnd = requestStart + durationMs;

      for (const existing of existingAppointments) {
        const existingStart = new Date(existing.startTime);
        const existingTimeMs = existingStart.getHours() * 3600000 + 
                               existingStart.getMinutes() * 60000;
        const existingEnd = existingTimeMs + durationMs;

        // Add buffer time to both appointments
        const bufferedRequestStart = requestStart - bufferMs;
        const bufferedRequestEnd = requestEnd + bufferMs;
        const bufferedExistingStart = existingTimeMs - bufferMs;
        const bufferedExistingEnd = existingEnd + bufferMs;

        // Check for overlap
        if (
          (bufferedRequestStart <= bufferedExistingEnd && 
           bufferedRequestEnd >= bufferedExistingStart)
        ) {
          return false;
        }
      }
    }

    // Check weekly schedule
    const dayOfWeek = date.getDay();
    const [schedule] = await db
      .select()
      .from(weeklySchedules)
      .where(
        and(
          eq(weeklySchedules.providerId, providerId),
          eq(weeklySchedules.dayOfWeek, dayOfWeek)
        )
      );

    if (!schedule || !schedule.isAvailable) return false;

    // Check if requested time is within schedule
    if (startTime < schedule.startTime || endTime > schedule.endTime) return false;

    // Check break times
    const [breakTime] = await db
      .select()
      .from(breakTimes)
      .where(
        and(
          eq(breakTimes.providerId, providerId),
          eq(breakTimes.dayOfWeek, dayOfWeek),
          lte(breakTimes.startTime, startTime),
          gte(breakTimes.endTime, endTime)
        )
      );

    if (breakTime) return false;

    return true;
  }

  // Helper function to parse time string to milliseconds since midnight
  private parseTimeToMs(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours * 3600 + minutes * 60) * 1000;
  }
}

export const storage = new DatabaseStorage();