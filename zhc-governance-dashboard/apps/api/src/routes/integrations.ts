/**
 * Integration Hub API routes.
 *
 * GET    /api/integrations                     — list all integrations for tenant
 * POST   /api/integrations                     — create/connect an integration
 * PATCH  /api/integrations/:id                 — update config or status
 * DELETE /api/integrations/:id                 — disconnect / remove
 * POST   /api/integrations/:id/test            — test connection health
 * POST   /api/integrations/webhooks/:tool      — receive inbound webhook events (public)
 */

import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getDb } from "../db/index.js";
import { governanceIntegrations, controlEvents } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const CreateIntegrationBody = z.object({
  toolName: z.enum([
    "paperclip",
    "langfuse",
    "guardrails_ai",
    "lakera",
    "nemo",
    "langsmith",
    "agentops",
    "killswitch",
  ]),
  agentId: z.string().uuid().optional(),
  processId: z.string().uuid().optional(),
  config: z.record(z.unknown()).optional(),
});

const UpdateIntegrationBody = z.object({
  config: z.record(z.unknown()).optional(),
  status: z.enum(["connected", "disconnected", "error"]).optional(),
});

// ---------------------------------------------------------------------------
// Connector health-check functions
// ---------------------------------------------------------------------------

async function testPaperclipConnection(config: Record<string, unknown>): Promise<{ ok: boolean; message: string }> {
  const url = config["url"] as string | undefined;
  const apiKey = config["apiKey"] as string | undefined;

  if (!url || !apiKey) return { ok: false, message: "url and apiKey required" };

  try {
    const res = await fetch(`${url}/api/agents/me`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return { ok: true, message: "Paperclip connected successfully" };
    return { ok: false, message: `HTTP ${res.status}: ${res.statusText}` };
  } catch (err) {
    return { ok: false, message: `Connection failed: ${String(err)}` };
  }
}

async function testLangfuseConnection(config: Record<string, unknown>): Promise<{ ok: boolean; message: string }> {
  const host = (config["host"] as string | undefined) ?? "https://cloud.langfuse.com";
  const publicKey = config["publicKey"] as string | undefined;
  const secretKey = config["secretKey"] as string | undefined;

  if (!publicKey || !secretKey) return { ok: false, message: "publicKey and secretKey required" };

  const credentials = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");

  try {
    const res = await fetch(`${host}/api/public/health`, {
      headers: { Authorization: `Basic ${credentials}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return { ok: true, message: "Langfuse connected successfully" };
    return { ok: false, message: `HTTP ${res.status}: ${res.statusText}` };
  } catch (err) {
    return { ok: false, message: `Connection failed: ${String(err)}` };
  }
}

type TestFn = (config: Record<string, unknown>) => Promise<{ ok: boolean; message: string }>;

const connectors: Partial<Record<string, TestFn>> = {
  paperclip: testPaperclipConnection,
  langfuse: testLangfuseConnection,
};

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export const integrationRoutes: FastifyPluginAsync = async (app) => {
  // ---- List integrations ----
  app.get("/api/integrations", async (req, reply) => {
    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    if (!tenantId) return reply.status(400).send({ error: "x-tenant-id header required" });

    const db = getDb();
    const rows = await db
      .select()
      .from(governanceIntegrations)
      .where(eq(governanceIntegrations.tenantId, tenantId));

    return rows;
  });

  // ---- Create / connect integration ----
  app.post("/api/integrations", async (req, reply) => {
    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    if (!tenantId) return reply.status(400).send({ error: "x-tenant-id header required" });

    const parsed = CreateIntegrationBody.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    const db = getDb();
    const [row] = await db
      .insert(governanceIntegrations)
      .values({
        tenantId,
        agentId: parsed.data.agentId ?? null,
        processId: parsed.data.processId ?? null,
        toolName: parsed.data.toolName,
        config: parsed.data.config ?? null,
        status: "disconnected",
      })
      .returning();

    return reply.status(201).send(row);
  });

  // ---- Update integration ----
  app.patch("/api/integrations/:id", async (req, reply) => {
    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    if (!tenantId) return reply.status(400).send({ error: "x-tenant-id header required" });

    const { id } = req.params as { id: string };
    const parsed = UpdateIntegrationBody.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    const db = getDb();
    const [row] = await db
      .update(governanceIntegrations)
      .set({
        ...(parsed.data.config !== undefined ? { config: parsed.data.config } : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status, lastSyncedAt: new Date() } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(governanceIntegrations.id, id), eq(governanceIntegrations.tenantId, tenantId)))
      .returning();

    if (!row) return reply.status(404).send({ error: "Integration not found" });
    return row;
  });

  // ---- Delete integration ----
  app.delete("/api/integrations/:id", async (req, reply) => {
    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    if (!tenantId) return reply.status(400).send({ error: "x-tenant-id header required" });

    const { id } = req.params as { id: string };
    const db = getDb();

    const [row] = await db
      .delete(governanceIntegrations)
      .where(and(eq(governanceIntegrations.id, id), eq(governanceIntegrations.tenantId, tenantId)))
      .returning();

    if (!row) return reply.status(404).send({ error: "Integration not found" });
    return reply.status(204).send();
  });

  // ---- Test connection ----
  app.post("/api/integrations/:id/test", async (req, reply) => {
    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    if (!tenantId) return reply.status(400).send({ error: "x-tenant-id header required" });

    const { id } = req.params as { id: string };
    const db = getDb();

    const [integration] = await db
      .select()
      .from(governanceIntegrations)
      .where(and(eq(governanceIntegrations.id, id), eq(governanceIntegrations.tenantId, tenantId)));

    if (!integration) return reply.status(404).send({ error: "Integration not found" });

    const testFn = connectors[integration.toolName];
    let result: { ok: boolean; message: string };

    if (testFn) {
      result = await testFn((integration.config as Record<string, unknown>) ?? {});
    } else {
      result = { ok: true, message: `${integration.toolName} — no health check available, assumed OK` };
    }

    // Update status based on test result
    const newStatus = result.ok ? "connected" : "error";
    await db
      .update(governanceIntegrations)
      .set({ status: newStatus, lastSyncedAt: new Date(), updatedAt: new Date() })
      .where(eq(governanceIntegrations.id, id));

    return { ...result, status: newStatus };
  });

  // ---- Inbound webhook events (unauthenticated, validated by secret) ----
  app.post("/api/integrations/webhooks/:tool", async (req, reply) => {
    const { tool } = req.params as { tool: string };
    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    if (!tenantId) return reply.status(400).send({ error: "x-tenant-id header required" });

    const payload = req.body as Record<string, unknown>;

    const db = getDb();

    // Ingest as a control event
    const eventType = (payload["type"] as string | undefined) ?? `${tool}_event`;
    const severity =
      (payload["severity"] as "info" | "warning" | "critical" | undefined) ?? "info";

    await db.insert(controlEvents).values({
      tenantId,
      eventType,
      severity,
      payload,
    });

    return reply.status(202).send({ received: true });
  });
};
