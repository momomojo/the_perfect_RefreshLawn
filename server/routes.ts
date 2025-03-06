import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage as dbStorage } from "./storage";
import { setupAuth } from "./auth";
import { insertServiceSchema, insertAppointmentSchema, insertWeeklyScheduleSchema, insertBlockedDateSchema, insertBreakTimeSchema, insertWaitlistSchema } from "@shared/schema";
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

  // Enhanced appointment status updates
  app.patch("/api/appointments/:id/status", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Only providers can update appointment status");
    }

    const { status, notes } = req.body;
    if (!["accepted", "confirmed", "in_progress", "completed", "cancelled", "declined"].includes(status)) {
      return res.status(400).send("Invalid status");
    }

    try {
      const appointment = await dbStorage.updateAppointmentStatus(
        parseInt(req.params.id),
        status,
        notes
      );
      res.json(appointment);
    } catch (err) {
      res.status(404).send("Appointment not found");
    }
  });

  // Weekly Schedule routes
  app.post("/api/weekly-schedules", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Only providers can manage schedules");
    }

    const parsed = insertWeeklyScheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const schedule = await dbStorage.createWeeklySchedule(parsed.data, req.user.id);
    res.status(201).json(schedule);
  });

  app.get("/api/weekly-schedules", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Access denied");
    }

    const schedules = await dbStorage.getProviderWeeklySchedules(req.user.id);
    res.json(schedules);
  });

  app.get("/api/weekly-schedules/provider/:providerId", async (req, res) => {
    const providerId = parseInt(req.params.providerId);
    const schedules = await dbStorage.getProviderWeeklySchedules(providerId);
    res.json(schedules);
  });

  app.patch("/api/weekly-schedules/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Only providers can update schedules");
    }

    try {
      const parsedUpdate = insertWeeklyScheduleSchema.partial().safeParse(req.body);
      if (!parsedUpdate.success) {
        return res.status(400).json(parsedUpdate.error);
      }

      const schedule = await dbStorage.updateWeeklySchedule(
        parseInt(req.params.id),
        parsedUpdate.data
      );
      res.json(schedule);
    } catch (err) {
      res.status(404).send("Schedule not found");
    }
  });

  app.delete("/api/weekly-schedules/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Only providers can delete schedules");
    }

    try {
      await dbStorage.deleteWeeklySchedule(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      res.status(404).send("Schedule not found");
    }
  });

  // Blocked Date routes
  app.post("/api/blocked-dates", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Only providers can manage blocked dates");
    }

    const parsed = insertBlockedDateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const blockedDate = await dbStorage.createBlockedDate(parsed.data, req.user.id);
    res.status(201).json(blockedDate);
  });

  app.get("/api/blocked-dates", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Access denied");
    }

    const blockedDates = await dbStorage.getProviderBlockedDates(req.user.id);
    res.json(blockedDates);
  });

  app.get("/api/blocked-dates/provider/:providerId", async (req, res) => {
    const providerId = parseInt(req.params.providerId);
    const blockedDates = await dbStorage.getProviderBlockedDates(providerId);
    res.json(blockedDates);
  });

  app.get("/api/blocked-dates/range", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Access denied");
    }

    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).send("Start date and end date are required");
    }

    try {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      const blockedDates = await dbStorage.getBlockedDatesByDateRange(req.user.id, start, end);
      res.json(blockedDates);
    } catch (err) {
      res.status(400).send("Invalid date format");
    }
  });

  app.patch("/api/blocked-dates/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Only providers can update blocked dates");
    }

    try {
      const parsedUpdate = insertBlockedDateSchema.partial().safeParse(req.body);
      if (!parsedUpdate.success) {
        return res.status(400).json(parsedUpdate.error);
      }

      const blockedDate = await dbStorage.updateBlockedDate(
        parseInt(req.params.id),
        parsedUpdate.data
      );
      res.json(blockedDate);
    } catch (err) {
      res.status(404).send("Blocked date not found");
    }
  });

  app.delete("/api/blocked-dates/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Only providers can delete blocked dates");
    }

    try {
      await dbStorage.deleteBlockedDate(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      res.status(404).send("Blocked date not found");
    }
  });


  // Break time routes
  app.post("/api/break-times", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Only providers can manage break times");
    }

    const parsed = insertBreakTimeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const breakTime = await dbStorage.createBreakTime(parsed.data, req.user.id);
    res.status(201).json(breakTime);
  });

  app.get("/api/break-times", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Access denied");
    }

    const breakTimes = await dbStorage.getProviderBreakTimes(req.user.id);
    res.json(breakTimes);
  });

  app.patch("/api/break-times/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Only providers can update break times");
    }

    try {
      const parsedUpdate = insertBreakTimeSchema.partial().safeParse(req.body);
      if (!parsedUpdate.success) {
        return res.status(400).json(parsedUpdate.error);
      }

      const breakTime = await dbStorage.updateBreakTime(
        parseInt(req.params.id),
        parsedUpdate.data
      );
      res.json(breakTime);
    } catch (err) {
      res.status(404).send("Break time not found");
    }
  });

  app.delete("/api/break-times/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Only providers can delete break times");
    }

    try {
      await dbStorage.deleteBreakTime(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      res.status(404).send("Break time not found");
    }
  });

  // Waitlist routes
  app.post("/api/waitlist", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "customer") {
      return res.status(403).send("Only customers can join the waitlist");
    }

    const parsed = insertWaitlistSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const waitlistEntry = await dbStorage.addToWaitlist(parsed.data, req.user.id);
    res.status(201).json(waitlistEntry);
  });

  app.get("/api/waitlist/customer", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "customer") {
      return res.status(403).send("Access denied");
    }

    const entries = await dbStorage.getCustomerWaitlistEntries(req.user.id);
    res.json(entries);
  });

  app.get("/api/waitlist/service/:serviceId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Access denied");
    }

    const entries = await dbStorage.getServiceWaitlistEntries(parseInt(req.params.serviceId));
    res.json(entries);
  });

  app.patch("/api/waitlist/:id/status", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Only providers can update waitlist status");
    }

    const { status } = req.body;
    if (!["fulfilled", "expired"].includes(status)) {
      return res.status(400).send("Invalid status");
    }

    try {
      const entry = await dbStorage.updateWaitlistStatus(parseInt(req.params.id), status);
      res.json(entry);
    } catch (err) {
      res.status(404).send("Waitlist entry not found");
    }
  });

  // Recurring appointment creation
  app.post("/api/appointments/recurring", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "customer") {
      return res.status(403).send("Only customers can create recurring appointments");
    }

    const { appointment, recurringInterval } = req.body;

    if (!["weekly", "biweekly", "monthly"].includes(recurringInterval)) {
      return res.status(400).send("Invalid recurring interval");
    }

    const parsed = insertAppointmentSchema.safeParse(appointment);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    try {
      const newAppointment = await dbStorage.createRecurringAppointment(
        parsed.data,
        req.user.id,
        recurringInterval
      );
      res.status(201).json(newAppointment);
    } catch (err) {
      res.status(400).send(err.message);
    }
  });

  // Check availability
  app.get("/api/availability/check", async (req, res) => {
    const { providerId, date, startTime, endTime, serviceId, address } = req.query;

    if (!providerId || !date || !startTime || !endTime || !serviceId || !address) {
      return res.status(400).send("Provider ID, date, start time, end time, service ID, and address are required");
    }

    try {
      const checkDate = new Date(date as string);
      const isAvailable = await dbStorage.isTimeSlotAvailable(
        parseInt(providerId as string),
        checkDate,
        startTime as string,
        endTime as string,
        parseInt(serviceId as string),
        address as string
      );
      res.json({ isAvailable });
    } catch (err) {
      res.status(400).send("Invalid parameters");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}