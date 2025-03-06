import { InsertUser, InsertService, InsertAppointment, User, Service, Appointment } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private services: Map<number, Service>;
  private appointments: Map<number, Appointment>;
  private currentId: { [key: string]: number };
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.services = new Map();
    this.appointments = new Map();
    this.currentId = { users: 1, services: 1, appointments: 1 };
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createService(service: InsertService, providerId: number): Promise<Service> {
    const id = this.currentId.services++;
    const newService = { ...service, id, providerId };
    this.services.set(id, newService);
    return newService;
  }

  async getService(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async getProviderServices(providerId: number): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.providerId === providerId
    );
  }

  async getAllServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }

  async createAppointment(appointment: InsertAppointment, customerId: number): Promise<Appointment> {
    const service = await this.getService(appointment.serviceId);
    if (!service) throw new Error("Service not found");

    const id = this.currentId.appointments++;
    const newAppointment = {
      ...appointment,
      id,
      customerId,
      status: "pending" as const,
      totalAmount: service.price
    };
    
    this.appointments.set(id, newAppointment);
    return newAppointment;
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async getCustomerAppointments(customerId: number): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      (apt) => apt.customerId === customerId
    );
  }

  async getProviderAppointments(providerId: number): Promise<Appointment[]> {
    const providerServices = await this.getProviderServices(providerId);
    const serviceIds = new Set(providerServices.map(s => s.id));
    
    return Array.from(this.appointments.values()).filter(
      (apt) => serviceIds.has(apt.serviceId)
    );
  }

  async updateAppointmentStatus(id: number, status: "accepted" | "completed" | "declined"): Promise<Appointment> {
    const appointment = await this.getAppointment(id);
    if (!appointment) throw new Error("Appointment not found");

    const updatedAppointment = { ...appointment, status };
    this.appointments.set(id, updatedAppointment);
    return updatedAppointment;
  }
}

export const storage = new MemStorage();
