/**
 * Local Webhook Receiver
 *
 * Captures all webhook payloads to logs/development/webhooks.ndjson
 * Use during local testing with Stripe CLI webhook forwarding:
 *
 *   stripe listen --forward-to localhost:8787/ingest
 *
 * Start this server:
 *   node webhook_sink.js
 *   OR
 *   npm run logs:receiver
 */

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8787;
const LOG_FILE = path.join(__dirname, "logs", "development", "webhooks.ndjson");

// Ensure logs directory exists
const logDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
  console.log(`Created log directory: ${logDir}`);
}

// Parse JSON bodies (5MB limit for webhook payloads)
app.use(express.json({ limit: "5mb" }));

// Also parse raw body for signature verification if needed
app.use(express.raw({ type: "application/json", limit: "5mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    logFile: LOG_FILE,
    logExists: fs.existsSync(LOG_FILE)
  });
});

// Main webhook ingestion endpoint
app.all("/ingest", (req, res) => {
  try {
    const entry = {
      ts: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      query: req.query
    };

    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(LOG_FILE, line);

    console.log(`[${entry.ts}] ${req.method} ${req.originalUrl} - Logged`);

    // Extract Stripe event type if present
    if (req.body && req.body.type) {
      console.log(`  └─ Stripe Event: ${req.body.type}`);
    }

    res.status(204).end();
  } catch (error) {
    console.error("Error logging webhook:", error);
    res.status(500).json({ error: "Failed to log webhook" });
  }
});

// Catch-all for other webhook endpoints
app.all("*", (req, res) => {
  try {
    const entry = {
      ts: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      query: req.query,
      note: "Caught by wildcard route"
    };

    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(LOG_FILE, line);

    console.log(`[${entry.ts}] ${req.method} ${req.originalUrl} - Logged (wildcard)`);

    res.status(204).end();
  } catch (error) {
    console.error("Error logging webhook:", error);
    res.status(500).json({ error: "Failed to log webhook" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Webhook Receiver Started                                  ║
╠════════════════════════════════════════════════════════════╣
║  Port:     ${PORT}                                            ║
║  Endpoint: http://localhost:${PORT}/ingest                   ║
║  Logs:     ${LOG_FILE}  ║
╠════════════════════════════════════════════════════════════╣
║  Use with Stripe CLI:                                      ║
║  stripe listen --forward-to localhost:${PORT}/ingest        ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\nShutting down webhook receiver...");
  process.exit(0);
});
