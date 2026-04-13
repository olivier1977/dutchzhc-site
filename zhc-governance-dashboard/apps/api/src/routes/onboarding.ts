/**
 * Onboarding API routes.
 *
 * POST /api/onboarding/invite          — generate an invite token for a tenant
 * GET  /api/onboarding/invite/:token   — validate invite token
 * POST /api/onboarding/workspace       — create new tenant workspace
 * POST /api/tenants/:id/agents         — add first agent (and subsequent agents)
 * GET  /api/tenants/slug-check/:slug   — check if slug is available
 */

import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createHmac, randomBytes } from "crypto";
import { getDb } from "../db/index.js";
import { tenants, agents } from "../db/schema.js";
import { eq } from "drizzle-orm";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ---------------------------------------------------------------------------
// Invite token helpers (HMAC-SHA256 signed, no DB required)
// ---------------------------------------------------------------------------

function generateInviteToken(tenantId: string, secret: string): { token: string; expiresAt: string } {
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
  const payload = `${tenantId}:${expiresAt}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  const tokenRaw = Buffer.from(`${payload}:${sig}`).toString("base64url");
  return { token: tokenRaw, expiresAt };
}

function validateInviteToken(
  token: string,
  secret: string,
): { valid: boolean; tenantId?: string; error?: string } {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return { valid: false, error: "Invalid token format" };

    const [tenantId, expiresAt, sig] = parts as [string, string, string];
    const payload = `${tenantId}:${expiresAt}`;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");

    if (sig !== expected) return { valid: false, error: "Invalid token signature" };
    if (new Date(expiresAt) < new Date()) return { valid: false, error: "Token expired" };

    return { valid: true, tenantId };
  } catch {
    return { valid: false, error: "Malformed token" };
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const CreateWorkspaceBody = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  inviteToken: z.string().optional(),
});

const AddAgentBody = z.object({
  name: z.string().min(1),
  role: z.enum(["ai_agent", "human"]).default("ai_agent"),
  did: z.string().optional(),
});

export const onboardingRoutes: FastifyPluginAsync = async (app) => {
  const getSecret = () =>
    process.env["COOKIE_SECRET"] ?? randomBytes(32).toString("hex");

  // ---- Generate invite ----
  app.post("/api/onboarding/invite", async (req, reply) => {
    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    if (!tenantId) return reply.status(400).send({ error: "x-tenant-id header required" });

    const { token, expiresAt } = generateInviteToken(tenantId, getSecret());
    const baseUrl = (req.headers["x-forwarded-proto"] ?? "http") + "://" + (req.headers["host"] ?? "localhost:3000");
    const inviteUrl = `${baseUrl}/onboarding?invite=${token}`;

    return { token, expiresAt, inviteUrl };
  });

  // ---- Validate invite ----
  app.get("/api/onboarding/invite/:token", async (req, reply) => {
    const { token } = req.params as { token: string };
    const result = validateInviteToken(token, getSecret());
    if (!result.valid) return reply.status(400).send({ error: result.error });

    const db = getDb();
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, result.tenantId!));
    return { valid: true, tenantId: result.tenantId, tenant: tenant ?? null };
  });

  // ---- Slug availability check ----
  app.get("/api/tenants/slug-check/:slug", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const db = getDb();
    const [existing] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug));
    return { available: !existing };
  });

  // ---- Create workspace ----
  app.post("/api/onboarding/workspace", async (req, reply) => {
    const parsed = CreateWorkspaceBody.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    const db = getDb();

    // Slug uniqueness check
    const [existing] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, parsed.data.slug));
    if (existing) return reply.status(409).send({ error: "Slug already taken. Please choose a different one." });

    const [tenant] = await db.insert(tenants).values({
      name: parsed.data.name,
      slug: parsed.data.slug,
      plan: "free",
    }).returning();

    return reply.status(201).send({ tenant });
  });

  // ---- Add agent to tenant ----
  app.post("/api/tenants/:tenantId/agents", async (req, reply) => {
    const { tenantId } = req.params as { tenantId: string };
    const parsed = AddAgentBody.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    const db = getDb();

    // Verify tenant exists
    const [tenant] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant) return reply.status(404).send({ error: "Tenant not found" });

    const [agent] = await db.insert(agents).values({
      tenantId,
      name: parsed.data.name,
      role: parsed.data.role,
      did: parsed.data.did ?? null,
      status: "active",
    }).returning();

    return reply.status(201).send(agent);
  });
};
