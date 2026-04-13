/**
 * Process governance API routes.
 *
 * GET  /api/processes                        — list processes for the tenant
 * POST /api/processes                        — create a process
 * GET  /api/processes/:id                    — process detail with agent map
 * GET  /api/processes/:id/governance-heatmap — coverage per pipeline step
 */

import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getDb } from "../db/index.js";
import {
  processes,
  agents,
  governanceIntegrations,
  controlEvents,
} from "../db/schema.js";
import { eq, and, gte, desc } from "drizzle-orm";

// Step config matches seed data shape
const StepSchema = z.object({
  id: z.string(),
  agentRole: z.string(),
  type: z.string(),
  agentId: z.string().uuid().optional(),
  description: z.string().optional(),
});

const CreateProcessBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  config: z
    .object({ steps: z.array(StepSchema).min(1) })
    .optional(),
});

type CoverageStatus = "healthy" | "degraded" | "critical" | "unknown";

export const processRoutes: FastifyPluginAsync = async (app) => {
  // ---- List processes ----
  app.get("/api/processes", async (req, reply) => {
    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    if (!tenantId) return reply.status(400).send({ error: "x-tenant-id header required" });

    const db = getDb();
    const rows = await db
      .select()
      .from(processes)
      .where(eq(processes.tenantId, tenantId))
      .orderBy(processes.createdAt);

    return rows;
  });

  // ---- Create process ----
  app.post("/api/processes", async (req, reply) => {
    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    if (!tenantId) return reply.status(400).send({ error: "x-tenant-id header required" });

    const parsed = CreateProcessBody.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    const db = getDb();
    const [process] = await db
      .insert(processes)
      .values({
        tenantId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        config: parsed.data.config ?? null,
      })
      .returning();

    return reply.status(201).send(process);
  });

  // ---- Process detail ----
  app.get("/api/processes/:id", async (req, reply) => {
    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    if (!tenantId) return reply.status(400).send({ error: "x-tenant-id header required" });

    const { id } = req.params as { id: string };
    const db = getDb();

    const [process] = await db
      .select()
      .from(processes)
      .where(and(eq(processes.id, id), eq(processes.tenantId, tenantId)));

    if (!process) return reply.status(404).send({ error: "Process not found" });

    // Resolve agent IDs from step config
    const steps = (process.config as { steps?: Array<{ id: string; agentRole: string; type: string; agentId?: string }> } | null)?.steps ?? [];
    const agentIds = [...new Set(steps.map((s) => s.agentId).filter(Boolean))] as string[];

    const agentList =
      agentIds.length > 0
        ? await db.select().from(agents).where(eq(agents.tenantId, tenantId))
        : [];

    const integrations = await db
      .select()
      .from(governanceIntegrations)
      .where(and(eq(governanceIntegrations.processId, id), eq(governanceIntegrations.tenantId, tenantId)));

    return { process, steps, agents: agentList, integrations };
  });

  // ---- Governance heatmap ----
  app.get("/api/processes/:id/governance-heatmap", async (req, reply) => {
    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    if (!tenantId) return reply.status(400).send({ error: "x-tenant-id header required" });

    const { id } = req.params as { id: string };
    const db = getDb();

    const [process] = await db
      .select()
      .from(processes)
      .where(and(eq(processes.id, id), eq(processes.tenantId, tenantId)));

    if (!process) return reply.status(404).send({ error: "Process not found" });

    const steps = (process.config as { steps?: Array<{ id: string; agentRole: string; type: string; agentId?: string }> } | null)?.steps ?? [];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [events, integrations] = await Promise.all([
      db.select().from(controlEvents)
        .where(and(eq(controlEvents.processId, id), eq(controlEvents.tenantId, tenantId), gte(controlEvents.createdAt, thirtyDaysAgo)))
        .orderBy(desc(controlEvents.createdAt)),

      db.select().from(governanceIntegrations)
        .where(and(eq(governanceIntegrations.processId, id), eq(governanceIntegrations.tenantId, tenantId))),
    ]);

    const connectedTools = new Set(
      integrations.filter((i) => i.status === "connected").map((i) => i.toolName),
    );

    const hasPaperclip = connectedTools.has("paperclip");
    const hasObservability = connectedTools.has("langfuse") || connectedTools.has("weights_biases");

    // Per-step coverage analysis
    const stepCoverage = steps.map((step) => {
      const stepEvents = events.filter((e) => e.payload && (e.payload as { stepId?: string }).stepId === step.id);
      const isHITL = step.type === "hitl_approval" || step.type === "multisig_approval";
      const isExecution = step.type === "execution" || step.type === "deployment" || step.type === "on_chain_execution";

      const guardrails: CoverageStatus = hasPaperclip ? "healthy" : "unknown";
      const hitl: CoverageStatus = isHITL ? "healthy" : isExecution && hasPaperclip ? "degraded" : isExecution ? "unknown" : "healthy";
      const hotl: CoverageStatus = hasObservability ? "healthy" : "unknown";
      const emergency: CoverageStatus = hasPaperclip ? "healthy" : "unknown";

      const gaps: string[] = [];
      if (guardrails === "unknown") gaps.push("No guardrails configured");
      if (hitl === "unknown" && isExecution) gaps.push("No HITL for execution step");
      if (hotl === "unknown") gaps.push("No observability tool connected");
      if (emergency === "unknown") gaps.push("No emergency break available");

      return {
        step,
        coverage: { guardrails, hitl, hotl, emergency },
        gaps,
        recentEvents: stepEvents.slice(0, 5),
        riskLevel: gaps.length === 0 ? "low" : gaps.length <= 2 ? "medium" : "high",
      };
    });

    const totalGaps = stepCoverage.reduce((acc, s) => acc + s.gaps.length, 0);
    const overallStatus: CoverageStatus =
      totalGaps === 0 ? "healthy" : totalGaps <= 3 ? "degraded" : "critical";

    return {
      processId: id,
      overallStatus,
      totalGaps,
      stepCoverage,
      recentEvents: events.slice(0, 20),
    };
  });
};
