/**
 * TRA Score API routes.
 *
 * POST /api/agents/:id/tra-score/calculate  — run TRA assessment, persist score
 * GET  /api/agents/:id/tra-score/latest     — latest persisted score
 * GET  /api/agents/:id/tra-score/badge.svg  — embeddable SVG badge (public, no auth)
 */

import { FastifyPluginAsync } from "fastify";
import { getDb } from "../db/index.js";
import { agents, reputationScores } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { computeTraScore } from "../tra/scoring-engine.js";
import { generateTraBadgeSvg } from "../tra/badge-generator.js";

export const traRoutes: FastifyPluginAsync = async (app) => {
  // ---- Run TRA assessment ----
  app.post("/api/agents/:id/tra-score/calculate", async (req, reply) => {
    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    if (!tenantId) return reply.status(400).send({ error: "x-tenant-id header required" });

    const { id } = req.params as { id: string };
    const db = getDb();

    // Verify agent belongs to tenant
    const [agent] = await db.select().from(agents)
      .where(and(eq(agents.id, id), eq(agents.tenantId, tenantId)));
    if (!agent) return reply.status(404).send({ error: "Agent not found" });

    const result = await computeTraScore(id, tenantId);

    // Determine next version number
    const [latest] = await db.select({ version: reputationScores.version })
      .from(reputationScores)
      .where(and(eq(reputationScores.agentId, id), eq(reputationScores.tenantId, tenantId)))
      .orderBy(desc(reputationScores.version))
      .limit(1);

    const nextVersion = (latest?.version ?? 0) + 1;

    // Persist the score
    const [saved] = await db.insert(reputationScores).values({
      tenantId,
      agentId: id,
      score: String(result.totalScore),
      components: {
        identityProof: result.layers.identityProof.score,
        governanceCoverage: result.layers.governanceCoverage.score,
        operationalTrackRecord: result.layers.operationalTrackRecord.score,
        transparency: result.layers.transparency.score,
        rating: result.rating,
      },
      version: nextVersion,
      computedAt: new Date(result.computedAt),
    }).returning();

    return { ...result, savedScoreId: saved?.id };
  });

  // ---- Latest score ----
  app.get("/api/agents/:id/tra-score/latest", async (req, reply) => {
    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    if (!tenantId) return reply.status(400).send({ error: "x-tenant-id header required" });

    const { id } = req.params as { id: string };
    const db = getDb();

    const [score] = await db.select().from(reputationScores)
      .where(and(eq(reputationScores.agentId, id), eq(reputationScores.tenantId, tenantId)))
      .orderBy(desc(reputationScores.version))
      .limit(1);

    if (!score) return reply.status(404).send({ error: "No score computed yet. POST to /tra-score/calculate first." });

    return score;
  });

  // ---- Embeddable SVG badge (public — no tenant header required) ----
  app.get("/api/agents/:id/tra-score/badge.svg", async (req, reply) => {
    const { id } = req.params as { id: string };
    const db = getDb();

    // Find the agent and latest score across all tenants (badge is public)
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    if (!agent) {
      // Return a "no data" badge rather than a 404, so embed URLs don't break
      const svg = generateTraBadgeSvg({ agentName: "Unknown Agent", score: 0, rating: "N/A" });
      return reply.header("Content-Type", "image/svg+xml").header("Cache-Control", "public, max-age=300").send(svg);
    }

    const [score] = await db.select().from(reputationScores)
      .where(eq(reputationScores.agentId, id))
      .orderBy(desc(reputationScores.version))
      .limit(1);

    const totalScore = score ? Math.round(parseFloat(String(score.score))) : 0;
    const rating = (score?.components as { rating?: string } | null)?.rating ?? "N/A";

    const svg = generateTraBadgeSvg({
      agentName: agent.name,
      score: totalScore,
      rating,
    });

    return reply
      .header("Content-Type", "image/svg+xml")
      .header("Cache-Control", "public, max-age=300")
      .send(svg);
  });
};
