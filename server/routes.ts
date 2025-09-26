import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateDigest, generateNextStep, generateContactSummary } from "./ai/gateway";
import type {
  DigestRequestPayload,
  NextStepRequestPayload,
  ContactSummaryRequestPayload,
} from "./ai/types";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  // API Routes
  app.post("/api/seed-demo", async (req, res) => {
    try {
      // Seed demo data
      await storage.seedDemo();
      res.json({ success: true, message: "Demo data seeded successfully" });
    } catch (error) {
      console.error("Error seeding demo data:", error);
      res.status(500).json({ success: false, message: "Failed to seed demo data" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/ai/digest", async (req, res) => {
    const payload = req.body as Partial<DigestRequestPayload> | undefined;

    if (!payload) {
      return res.status(400).json({ success: false, message: "Body requerido" });
    }

    const hasStats = payload.stats && typeof payload.stats.hotDeals === "number";
    const hasFallback = typeof payload.fallbackText === "string";
    const hasTimeframe = payload.timeframe === "today" || payload.timeframe === "week" || payload.timeframe === "month";

    if (!hasStats || !hasFallback || !hasTimeframe) {
      return res.status(400).json({ success: false, message: "Payload inválido" });
    }

    try {
      const digest = await generateDigest(payload as DigestRequestPayload);
      res.json({ success: true, digest });
    } catch (error) {
      console.error("[AI] digest endpoint", error);
      res.status(500).json({ success: false, message: "No se pudo generar el digest" });
    }
  });

  app.post("/api/ai/next-step", async (req, res) => {
    const payload = req.body as Partial<NextStepRequestPayload> | undefined;
    if (!payload?.deal || !payload.fallbackText) {
      return res.status(400).json({ success: false, message: "Payload inválido" });
    }

    try {
      const response = await generateNextStep(payload as NextStepRequestPayload);
      res.json({ success: true, suggestion: response });
    } catch (error) {
      console.error("[AI] next-step endpoint", error);
      res.status(500).json({ success: false, message: "No se pudo generar el próximo paso" });
    }
  });

  app.post("/api/ai/contact-summary", async (req, res) => {
    const payload = req.body as Partial<ContactSummaryRequestPayload> | undefined;
    if (!payload?.contact || !payload.fallbackText) {
      return res.status(400).json({ success: false, message: "Payload inválido" });
    }

    try {
      const response = await generateContactSummary(payload as ContactSummaryRequestPayload);
      res.json({ success: true, summary: response });
    } catch (error) {
      console.error("[AI] contact-summary endpoint", error);
      res.status(500).json({ success: false, message: "No se pudo generar el resumen del contacto" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
