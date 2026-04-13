/**
 * Agent governance API routes.
 *
 * GET  /api/agents                   — list agents for the current tenant
 * GET  /api/agents/:id/governance    — full governance state for one agent
 * GET  /api/agents/:id/control-events — recent control events (last 30 days)
 * PUT  /api/agents/:id/identity      — set DID + VC links
 */

import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getDb } from "../db/index.js";
import { agents, controlEvents, identityRecords, reputationScores, governanceIntegrations } from "../db/schema.js";
import { eq, and, gte, desc } from "drizzle-orm";

const PutIdentityBody = z.object({
  did: z.string().min(7, "DID must be at least 7 characters"),
  vcJson: z.record(z.unknown()).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const agentRoutes: FastifyPluginAsync = async (app) => {
  // ---- List agents ----
  app.get("/api/agents", async (req, reply) => {
    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    if (!tenantId) return reply.status(400).send({ error: "x-tenant-id header required" });

    const db = getDb();
    const rows = await db
      .select()
      .from(agents)
      .where(eq(agents.tenantId, tenantId))
      .orderBy(agents.createdAt);

    return rows;
  });

  // ---- Full governance state ----
  app.get("/api/agents/:id/governance", async (req, reply) => {
    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    if (!tenantId) return reply.status(400).send({ error: "x-tenant-id header required" });

    const { id } = req.params as { id: string };
    const db = getDb();

    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.tenantId, tenantId)));

    if (!agent) return reply.status(404).send({ error: "Agent not found" });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [events, identities, scores, integrations] = await Promise.all([
      db.select().from(controlEvents)
        .where(and(eq(controlEvents.agentId, id), eq(controlEvents.tenantId, tenantId), gte(controlEvents.createdAt, thirtyDaysAgo)))
        .orderBy(desc(controlEvents.createdAt))
        .limit(50),

      db.select().from(identityRecords)
        .where(and(eq(identityRecords.agentId, id), eq(identityRecords.tenantId, tenantId)))
        .orderBy(desc(identityRecords.createdAt)),

      db.select().from(reputationScores)
        .where(and(eq(reputationScores.agentId, id), eq(reputationScores.tenantId, tenantId)))
        .orderBy(desc(reputationScores.version))
        .limit(1),

      db.select().from(governanceIntegrations)
        .where(and(eq(governanceIntegrations.agentId, id), eq(governanceIntegrations.tenantId, tenantId))),
    ]);

    // Derive control coverage from events + integrations
    const coverage = deriveControlCoverage(events, integrations);

    return {
      agent,
      identity: identities[0] ?? null,
      latestScore: scores[0] ?? null,
      integrations,
      controlCoverage: coverage,
      recentEvents: events.slice(0, 10),
    };
  });

  // ---- Control events ----
  app.get("/api/agents/:id/control-events", async (req, reply) => {
    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    if (!tenantId) return reply.status(400).send({ error: "x-tenant-id header required" });

    const { id } = req.params as { id: string };
    const db = getDb();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const events = await db.select().from(controlEvents)
      .where(and(eq(controlEvents.agentId, id), eq(controlEvents.tenantId, tenantId), gte(controlEvents.createdAt, thirtyDaysAgo)))
      .orderBy(desc(controlEvents.createdAt))
      .limit(100);

    return events;
  });

  // ---- Set DID + VC ----
  app.put("/api/agents/:id/identity", async (req, reply) => {
    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    if (!tenantId) return reply.status(400).send({ error: "x-tenant-id header required" });

    const { id } = req.params as { id: string };
    const parsed = PutIdentityBody.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    const db = getDb();

    // Verify agent belongs to tenant
    const [agent] = await db.select().from(agents)
      .where(and(eq(agents.id, id), eq(agents.tenantId, tenantId)));
    if (!agent) return reply.status(404).send({ error: "Agent not found" });

    // Update agent DID
    await db.update(agents)
      .set({ did: parsed.data.did, updatedAt: new Date() })
      .where(eq(agents.id, id));

    // Insert new identity record
    const [record] = await db.insert(identityRecords).values({
      tenantId,
      agentId: id,
      did: parsed.data.did,
      vcJson: parsed.data.vcJson ?? null,
      issuedAt: new Date(),
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    }).returning();

    return record;
  });
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ControlEvent = typeof controlEvents.$inferSelect;
type Integration = typeof governanceIntegrations.$inferSelect;

type CoverageStatus = "healthy" | "degraded" | "critical" | "unknown";

function deriveControlCoverage(
  events: ControlEvent[],
  integrations: Integration[],
): { guardrails: CoverageStatus; hitl: CoverageStatus; hotl: CoverageStatus; emergency: CoverageStatus } {
  const connectedTools = new Set(
    integrations.filter((i) => i.status === "connected").map((i) => i.toolName),
  );

  const hasPaperclip = connectedTools.has("paperclip");
  const hasLangfuse = connectedTools.has("langfuse") || connectedTools.has("weights_biases");

  const criticalEvents = events.filter((e) => e.severity === "critical").length;
  const warningEvents = events.filter((e) => e.severity === "warning").length;

  const severityStatus = (c: number, w: number): CoverageStatus =>
    c > 0 ? "critical" : w > 2 ? "degraded" : "healthy";

  return {
    guardrails: hasPaperclip ? severityStatus(criticalEvents, warningEvents) : "unknown",
    hitl: hasPaperclip ? severityStatus(Math.floor(criticalEvents / 2), warningEvents) : "unknown",
    hotl: hasLangfuse ? "healthy" : "unknown",
    emergency: hasPaperclip ? (criticalEvents > 3 ? "critical" : "healthy") : "unknown",
  };
}
