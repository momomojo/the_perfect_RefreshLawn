import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage as dbStorage } from "./storage";
import { setupAuth } from "./auth";
import { insertServiceSchema, insertAppointmentSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from 'express';

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: uploadDir,
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: multerStorage });

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));

  // File upload route
  app.post("/api/upload", upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  });

  // Service routes
  app.post("/api/services", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Only providers can create services");
    }

    const parsed = insertServiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const service = await dbStorage.createService(parsed.data, req.user.id);
    res.status(201).json(service);
  });

  app.get("/api/services", async (req, res) => {
    const services = await dbStorage.getAllServices();
    res.json(services);
  });

  app.get("/api/services/provider", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Access denied");
    }

    const services = await dbStorage.getProviderServices(req.user.id);
    res.json(services);
  });

  app.get("/api/services/:id", async (req, res) => {
    const service = await dbStorage.getService(parseInt(req.params.id));
    if (!service) {
      return res.status(404).send("Service not found");
    }
    res.json(service);
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

    const appointment = await dbStorage.createAppointment(parsed.data, req.user.id);
    res.status(201).json(appointment);
  });

  app.get("/api/appointments/customer", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "customer") {
      return res.status(403).send("Access denied");
    }

    const appointments = await dbStorage.getCustomerAppointments(req.user.id);
    res.json(appointments);
  });

  app.get("/api/appointments/provider", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Access denied");
    }

    const appointments = await dbStorage.getProviderAppointments(req.user.id);
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
      const appointment = await dbStorage.updateAppointmentStatus(
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