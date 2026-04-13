/**
 * Public TRA score endpoints — no authentication required.
 *
 * GET /api/public/agents/:id/badge.svg   — embeddable SVG badge
 * GET /api/public/agents/:id/badge.json  — JSON badge (shields.io compatible)
 * GET /api/public/agents/:id/tra-score   — public TRA profile JSON
 */

import { FastifyPluginAsync } from "fastify";
import { getDb } from "../db/index.js";
import { agents, reputationScores } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { generateTraBadgeSvg } from "../tra/badge-generator.js";

const CACHE = "public, max-age=300, stale-while-revalidate=60";

export const publicRoutes: FastifyPluginAsync = async (app) => {
  // ---- SVG badge ----
  app.get("/api/public/agents/:id/badge.svg", async (req, reply) => {
    const { id } = req.params as { id: string };
    const db = getDb();
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    const [score] = agent
      ? await db.select().from(reputationScores)
          .where(eq(reputationScores.agentId, id))
          .orderBy(desc(reputationScores.version))
          .limit(1)
      : [];

    const totalScore = score ? Math.round(parseFloat(String(score.score))) : 0;
    const rating = (score?.components as { rating?: string } | null)?.rating ?? "N/A";

    const baseUrl = (req.headers["x-forwarded-proto"] ?? "https") + "://" + (req.headers["host"] ?? "governance.dutchzhc.com");
    const shareUrl = `${baseUrl}/public/agents/${id}/tra-score`;

    const svg = generateTraBadgeSvg({
      agentName: agent?.name ?? "Unknown Agent",
      score: totalScore,
      rating,
      shareUrl,
    });

    return reply
      .header("Content-Type", "image/svg+xml")
      .header("Cache-Control", CACHE)
      .send(svg);
  });

  // ---- JSON badge (shields.io endpoint format) ----
  app.get("/api/public/agents/:id/badge.json", async (req, reply) => {
    const { id } = req.params as { id: string };
    const db = getDb();
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    if (!agent) return reply.status(404).send({ error: "Agent not found" });

    const [score] = await db.select().from(reputationScores)
      .where(eq(reputationScores.agentId, id))
      .orderBy(desc(reputationScores.version))
      .limit(1);

    const totalScore = score ? Math.round(parseFloat(String(score.score))) : null;
    const rating = (score?.components as { rating?: string } | null)?.rating ?? null;

    // shields.io endpoint format
    return reply
      .header("Cache-Control", CACHE)
      .send({
        schemaVersion: 1,
        label: "TRA Score",
        message: totalScore !== null ? `${totalScore} ${rating}` : "Not assessed",
        color: scoreToColor(totalScore),
        namedLogo: "shield",
      });
  });

  // ---- Public TRA profile ----
  app.get("/api/public/agents/:id/tra-score", async (req, reply) => {
    const { id } = req.params as { id: string };
    const db = getDb();
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    if (!agent) return reply.status(404).send({ error: "Agent not found" });

    const scores = await db.select().from(reputationScores)
      .where(eq(reputationScores.agentId, id))
      .orderBy(desc(reputationScores.version))
      .limit(5);

    const latest = scores[0];
    const totalScore = latest ? Math.round(parseFloat(String(latest.score))) : null;
    const rating = (latest?.components as { rating?: string } | null)?.rating ?? null;
    const components = latest?.components as Record<string, unknown> | null;

    return reply.header("Cache-Control", CACHE).send({
      agent: {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        did: agent.did,
        status: agent.status,
      },
      traScore: totalScore !== null ? {
        total: totalScore,
        rating,
        components: {
          identityProof: components?.["identityProof"] ?? null,
          governanceCoverage: components?.["governanceCoverage"] ?? null,
          operationalTrackRecord: components?.["operationalTrackRecord"] ?? null,
          transparency: components?.["transparency"] ?? null,
        },
        assessedAt: latest?.computedAt ?? null,
        version: latest?.version ?? null,
      } : null,
      badgeUrl: `/api/public/agents/${id}/badge.svg`,
      profileUrl: `/public/agents/${id}/tra-score`,
    });
  });
};

function scoreToColor(score: number | null): string {
  if (score === null) return "lightgray";
  if (score >= 80) return "brightgreen";
  if (score >= 60) return "green";
  if (score >= 50) return "yellow";
  if (score >= 40) return "orange";
  return "red";
}
