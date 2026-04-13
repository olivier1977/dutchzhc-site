/**
 * Dashboard summary API route.
 *
 * GET /api/dashboard — tenant summary: agent count, process count,
 *   active integrations, open alerts, governance coverage %, TRA leaderboard,
 *   and recent control events.
 */

import { FastifyPluginAsync } from "fastify";
import { getDb } from "../db/index.js";
import {
  agents,
  processes,
  governanceIntegrations,
  controlEvents,
  reputationScores,
} from "../db/schema.js";
import { eq, and, gte, isNull, desc, count } from "drizzle-orm";

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/dashboard", async (req, reply) => {
    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    if (!tenantId) return reply.status(400).send({ error: "x-tenant-id header required" });

    const db = getDb();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      allAgents,
      allProcesses,
      allIntegrations,
      recentEvents,
      openAlerts,
      agentScores,
    ] = await Promise.all([
      db.select().from(agents).where(eq(agents.tenantId, tenantId)),

      db.select({ id: processes.id }).from(processes)
        .where(eq(processes.tenantId, tenantId)),

      db.select().from(governanceIntegrations)
        .where(eq(governanceIntegrations.tenantId, tenantId)),

      db.select().from(controlEvents)
        .where(and(eq(controlEvents.tenantId, tenantId), gte(controlEvents.createdAt, thirtyDaysAgo)))
        .orderBy(desc(controlEvents.createdAt))
        .limit(20),

      db.select({ id: controlEvents.id }).from(controlEvents)
        .where(and(eq(controlEvents.tenantId, tenantId), isNull(controlEvents.resolvedAt))),

      // Latest score per agent
      db.select().from(reputationScores)
        .where(eq(reputationScores.tenantId, tenantId))
        .orderBy(desc(reputationScores.version)),
    ]);

    // Deduplicate scores — latest version per agent
    const seenAgents = new Set<string>();
    const latestScores = agentScores.filter((s) => {
      if (seenAgents.has(s.agentId)) return false;
      seenAgents.add(s.agentId);
      return true;
    });

    // Governance coverage gauge: % of agents with ≥2 connected integrations
    const agentIntMap = new Map<string, number>();
    for (const i of allIntegrations) {
      if (i.agentId && i.status === "connected") {
        agentIntMap.set(i.agentId, (agentIntMap.get(i.agentId) ?? 0) + 1);
      }
    }

    const coveredAgents = allAgents.filter((a) => (agentIntMap.get(a.id) ?? 0) >= 2).length;
    const coveragePercent = allAgents.length > 0
      ? Math.round((coveredAgents / allAgents.length) * 100)
      : 0;

    // TRA leaderboard
    const leaderboard = latestScores
      .map((s) => {
        const agent = allAgents.find((a) => a.id === s.agentId);
        return {
          agentId: s.agentId,
          agentName: agent?.name ?? "Unknown",
          score: Math.round(parseFloat(String(s.score))),
          rating: (s.components as { rating?: string } | null)?.rating ?? "N/A",
          version: s.version,
        };
      })
      .sort((a, b) => b.score - a.score);

    return {
      summary: {
        agents: allAgents.length,
        processes: allProcesses.length,
        activeIntegrations: allIntegrations.filter((i) => i.status === "connected").length,
        openAlerts: openAlerts.length,
      },
      governanceCoveragePercent: coveragePercent,
      coveredAgents,
      totalAgents: allAgents.length,
      recentEvents: recentEvents.slice(0, 10),
      traLeaderboard: leaderboard,
    };
  });
};
