import { users, services, appointments, type User, type Service, type Appointment, type InsertUser, type InsertService, type InsertAppointment } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
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

    const [newAppointment] = await db
      .insert(appointments)
      .values({
        ...appointment,
        customerId,
        status: "pending",
        totalAmount: service.price,
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

    return await db
      .select()
      .from(appointments)
      .where(
        serviceIds.length > 0 
          ? appointments.serviceId.in(serviceIds)
          : eq(appointments.id, -1) // Return empty if no services
      );
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
}

export const storage = new DatabaseStorage();