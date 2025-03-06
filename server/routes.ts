import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertServiceSchema, insertAppointmentSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Service routes
  app.post("/api/services", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Only providers can create services");
    }

    const parsed = insertServiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const service = await storage.createService(parsed.data, req.user.id);
    res.status(201).json(service);
  });

  app.get("/api/services", async (req, res) => {
    const services = await storage.getAllServices();
    res.json(services);
  });

  app.get("/api/services/provider", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Access denied");
    }

    const services = await storage.getProviderServices(req.user.id);
    res.json(services);
  });

  // Appointment routes
  app.post("/api/appointments", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "customer") {
      return res.status(403).send("Only customers can create appointments");
    }

    const parsed = insertAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const appointment = await storage.createAppointment(parsed.data, req.user.id);
    res.status(201).json(appointment);
  });

  app.get("/api/appointments/customer", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "customer") {
      return res.status(403).send("Access denied");
    }

    const appointments = await storage.getCustomerAppointments(req.user.id);
    res.json(appointments);
  });

  app.get("/api/appointments/provider", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Access denied");
    }

    const appointments = await storage.getProviderAppointments(req.user.id);
    res.json(appointments);
  });

  app.patch("/api/appointments/:id/status", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Only providers can update appointment status");
    }

    const { status } = req.body;
    if (!["accepted", "completed", "declined"].includes(status)) {
      return res.status(400).send("Invalid status");
    }

    try {
      const appointment = await storage.updateAppointmentStatus(
        parseInt(req.params.id),
        status
      );
      res.json(appointment);
    } catch (err) {
      res.status(404).send("Appointment not found");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
