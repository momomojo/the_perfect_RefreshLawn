import { users, services, appointments, weeklySchedules, blockedDates, breakTimes, waitlist, type User, type Service, type Appointment, type WeeklySchedule, type BlockedDate, type BreakTime, type Waitlist, type InsertUser, type InsertService, type InsertAppointment, type InsertWeeklySchedule, type InsertBlockedDate, type InsertBreakTime, type InsertWaitlist } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, inQuery, inArray, sql } from "drizzle-orm";
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
    serviceId: number,
    address: string
  ): Promise<boolean>;

  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

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
      .where(
        inArray(appointments.serviceId, serviceIds)
      );
  }

  async updateAppointmentStatus(
    id: number,
    status: "accepted" | "confirmed" | "in_progress" | "completed" | "cancelled" | "declined",
    notes?: string
  ): Promise<Appointment> {
    const updates: any = { status };
    if (notes && status === "completed") {
      updates.completionNotes = notes;
    }

    const [appointment] = await db
      .update(appointments)
      .set(updates)
      .where(eq(appointments.id, id))
      .returning();

    if (!appointment) throw new Error("Appointment not found");
    return appointment;
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
    serviceId: number,
    address: string
  ): Promise<boolean> {
    console.log('Checking availability:', {
      providerId,
      date: date.toISOString(),
      startTime,
      endTime,
      serviceId
    });

    // Get the service
    const service = await this.getService(serviceId);
    if (!service) {
      console.log('Service not found');
      return false;
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

    if (!schedule || !schedule.isAvailable) {
      console.log('No available schedule for day:', dayOfWeek);
      return false;
    }

    if (startTime < schedule.startTime || endTime > schedule.endTime) {
      console.log('Time outside schedule hours:', schedule.startTime, '-', schedule.endTime);
      return false;
    }

    // Check if there's already an appointment at this exact time
    const dateStr = date.toISOString().split('T')[0];
    const existingAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.serviceId, serviceId),
          eq(sql`DATE(${appointments.startTime})`, dateStr),
          eq(sql`TIME(${appointments.startTime})::time::text`, startTime)
        )
      );

    console.log('Existing appointments:', existingAppointments);

    // If there's any appointment at this exact time slot, it's not available
    if (existingAppointments.length > 0) {
      console.log('Time slot is already booked');
      return false;
    }

    console.log('Time slot is available');
    return true;
  }
}

export const storage = new DatabaseStorage();