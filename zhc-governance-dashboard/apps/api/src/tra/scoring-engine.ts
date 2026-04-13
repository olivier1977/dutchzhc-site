/**
 * TRA (Trust Rating Agency) Scoring Engine
 *
 * Four scoring layers (0–100 total):
 *
 * 1. Identity Proof (0–25 pts)
 *    - DID resolved from network
 *    - VC present, not expired, not revoked
 *
 * 2. Governance Coverage (0–40 pts)
 *    - 10 pts each: guardrails, HITL, HOTL, emergency break
 *    - Partial credit for degraded coverage
 *
 * 3. Operational Track Record (0–25 pts)
 *    - Based on governance tool connections + control event history
 *
 * 4. Transparency (0–10 pts)
 *    - DID published, VC discoverable, role documented
 */

import { getDb } from "../db/index.js";
import {
  agents,
  identityRecords,
  governanceIntegrations,
  controlEvents,
  reputationScores,
} from "../db/schema.js";
import { eq, and, gte, desc } from "drizzle-orm";

// ---------------------------------------------------------------------------
// DID Resolver (did:web only for Phase 1)
// ---------------------------------------------------------------------------

export async function resolveDid(did: string): Promise<{ ok: boolean; document?: unknown; error?: string }> {
  if (!did.startsWith("did:web:")) {
    return { ok: false, error: `Unsupported DID method: ${did.split(":")[1]}` };
  }

  const withoutPrefix = did.slice("did:web:".length);
  const [host, ...pathParts] = withoutPrefix.split(":");

  let url: string;
  if (pathParts.length === 0) {
    url = `https://${host}/.well-known/did.json`;
  } else {
    url = `https://${host}/${pathParts.join("/")}did.json`;
  }

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { ok: false, error: `DID fetch failed: HTTP ${res.status}` };
    const document = await res.json();
    return { ok: true, document };
  } catch (err) {
    return { ok: false, error: `DID resolution failed: ${String(err)}` };
  }
}

// ---------------------------------------------------------------------------
// VC Verifier (structural + expiry + revocation checks)
// ---------------------------------------------------------------------------

export function verifyVc(vcJson: unknown): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!vcJson || typeof vcJson !== "object") {
    return { valid: false, issues: ["No VC JSON present"] };
  }

  const vc = vcJson as Record<string, unknown>;

  // Structural checks
  if (!Array.isArray(vc["@context"])) issues.push("Missing @context");
  if (!Array.isArray(vc["type"])) issues.push("Missing type array");
  if (!vc["issuer"]) issues.push("Missing issuer");
  if (!vc["issuanceDate"]) issues.push("Missing issuanceDate");
  if (!vc["credentialSubject"]) issues.push("Missing credentialSubject");

  // Expiry check
  const expirationDate = vc["expirationDate"] as string | undefined;
  if (expirationDate && new Date(expirationDate) < new Date()) {
    issues.push(`VC expired on ${expirationDate}`);
  }

  // Revocation check (simple: look for revocationListCredential in status)
  const credentialStatus = vc["credentialStatus"] as Record<string, unknown> | undefined;
  if (credentialStatus) {
    // We can't check revocation list without an external fetch in Phase 1
    // Flag as pending rather than invalid
    issues.push("Revocation status not verified (would require online check)");
  }

  return { valid: issues.filter((i) => !i.startsWith("Revocation")).length === 0, issues };
}

// ---------------------------------------------------------------------------
// Coverage derivation (mirrors agent route logic)
// ---------------------------------------------------------------------------

type CoverageStatus = "healthy" | "degraded" | "critical" | "unknown";

interface CoverageMap {
  guardrails: CoverageStatus;
  hitl: CoverageStatus;
  hotl: CoverageStatus;
  emergency: CoverageStatus;
}

function coverageScore(status: CoverageStatus): number {
  switch (status) {
    case "healthy": return 10;
    case "degraded": return 5;
    case "critical": return 2;
    case "unknown": return 0;
  }
}

function deriveAgentCoverage(
  events: { severity: string; eventType: string }[],
  integrations: { toolName: string; status: string }[],
): CoverageMap {
  const connected = new Set(integrations.filter((i) => i.status === "connected").map((i) => i.toolName));
  const hasPaperclip = connected.has("paperclip");
  const hasObs = connected.has("langfuse") || connected.has("agentops") || connected.has("langsmith");
  const hasGuardrail = connected.has("guardrails_ai") || connected.has("lakera") || connected.has("nemo");
  const critical = events.filter((e) => e.severity === "critical").length;
  const warnings = events.filter((e) => e.severity === "warning").length;

  return {
    guardrails: hasGuardrail ? (critical > 2 ? "critical" : warnings > 3 ? "degraded" : "healthy") : (hasPaperclip ? "degraded" : "unknown"),
    hitl: hasPaperclip ? (critical > 0 ? "degraded" : "healthy") : "unknown",
    hotl: hasObs ? "healthy" : "unknown",
    emergency: hasPaperclip || connected.has("killswitch") ? "healthy" : "unknown",
  };
}

// ---------------------------------------------------------------------------
// Main scoring function
// ---------------------------------------------------------------------------

export interface TraScoreResult {
  agentId: string;
  totalScore: number;
  rating: string;
  layers: {
    identityProof: { score: number; maxScore: number; detail: Record<string, unknown> };
    governanceCoverage: { score: number; maxScore: number; detail: Record<string, unknown> };
    operationalTrackRecord: { score: number; maxScore: number; detail: Record<string, unknown> };
    transparency: { score: number; maxScore: number; detail: Record<string, unknown> };
  };
  computedAt: string;
}

export async function computeTraScore(agentId: string, tenantId: string): Promise<TraScoreResult> {
  const db = getDb();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [[agent], identities, events, integrations] = await Promise.all([
    db.select().from(agents).where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId))),
    db.select().from(identityRecords).where(and(eq(identityRecords.agentId, agentId), eq(identityRecords.tenantId, tenantId))).orderBy(desc(identityRecords.createdAt)),
    db.select().from(controlEvents).where(and(eq(controlEvents.agentId, agentId), eq(controlEvents.tenantId, tenantId), gte(controlEvents.createdAt, thirtyDaysAgo))),
    db.select().from(governanceIntegrations).where(and(eq(governanceIntegrations.agentId, agentId), eq(governanceIntegrations.tenantId, tenantId))),
  ]);

  if (!agent) throw new Error("Agent not found");

  const latestIdentity = identities[0];

  // ---- Layer 1: Identity Proof (0–25) ----
  let identityScore = 0;
  const identityDetail: Record<string, unknown> = {
    hasDid: !!agent.did,
    hasVc: !!latestIdentity,
  };

  if (agent.did) {
    identityScore += 8; // DID configured
    const resolved = await resolveDid(agent.did).catch(() => ({ ok: false, error: "timeout" }));
    identityDetail["didResolved"] = resolved.ok;
    if (resolved.ok) identityScore += 7; // DID resolves from network
  }

  if (latestIdentity) {
    const isExpired = latestIdentity.expiresAt && new Date(latestIdentity.expiresAt) < new Date();
    const isRevoked = !!latestIdentity.revokedAt;
    identityDetail["vcExpired"] = !!isExpired;
    identityDetail["vcRevoked"] = isRevoked;

    if (!isExpired && !isRevoked) {
      identityScore += 5; // VC present and valid
      if (latestIdentity.vcJson) {
        const { valid, issues } = verifyVc(latestIdentity.vcJson);
        identityDetail["vcStructureValid"] = valid;
        identityDetail["vcIssues"] = issues;
        if (valid) identityScore += 5; // VC structurally valid
      }
    }
  }

  // ---- Layer 2: Governance Coverage (0–40) ----
  const coverage = deriveAgentCoverage(events, integrations);
  const coverageScore2 =
    coverageScore(coverage.guardrails) +
    coverageScore(coverage.hitl) +
    coverageScore(coverage.hotl) +
    coverageScore(coverage.emergency);

  const coverageDetail: Record<string, unknown> = {
    guardrails: coverage.guardrails,
    hitl: coverage.hitl,
    hotl: coverage.hotl,
    emergency: coverage.emergency,
    connectedTools: integrations.filter((i) => i.status === "connected").map((i) => i.toolName),
  };

  // ---- Layer 3: Operational Track Record (0–25) ----
  let operationalScore = 0;
  const totalEvents = events.length;
  const criticalCount = events.filter((e) => e.severity === "critical").length;
  const resolvedEvents = events.filter((e) => (e as { resolvedAt?: unknown }).resolvedAt).length;
  const connectedCount = integrations.filter((i) => i.status === "connected").length;

  if (connectedCount >= 2) operationalScore += 8; // Multiple tools connected
  else if (connectedCount >= 1) operationalScore += 4;

  if (totalEvents > 0) {
    const resolutionRate = resolvedEvents / totalEvents;
    operationalScore += Math.round(resolutionRate * 10); // Up to 10 pts for resolution rate
    if (criticalCount === 0) operationalScore += 7; // No critical events
    else if (criticalCount <= 2) operationalScore += 3;
  } else {
    operationalScore += 10; // No events = clean record (give benefit of doubt)
  }

  const operationalDetail: Record<string, unknown> = {
    totalEvents,
    criticalEvents: criticalCount,
    resolvedEvents,
    connectedToolCount: connectedCount,
  };

  // ---- Layer 4: Transparency (0–10) ----
  let transparencyScore = 0;
  const transparencyDetail: Record<string, unknown> = {};

  if (agent.did) { transparencyScore += 3; transparencyDetail["didPublic"] = true; }
  if (agent.role) { transparencyScore += 2; transparencyDetail["roleDocumented"] = true; }
  if (latestIdentity?.vcJson) { transparencyScore += 3; transparencyDetail["vcPublished"] = true; }
  if (latestIdentity && !latestIdentity.revokedAt) { transparencyScore += 2; transparencyDetail["identityActive"] = true; }

  // ---- Composite ----
  const total = Math.min(100, identityScore + coverageScore2 + operationalScore + transparencyScore);
  const rating = computeRating(total);

  return {
    agentId,
    totalScore: total,
    rating,
    layers: {
      identityProof: { score: identityScore, maxScore: 25, detail: identityDetail },
      governanceCoverage: { score: coverageScore2, maxScore: 40, detail: coverageDetail },
      operationalTrackRecord: { score: operationalScore, maxScore: 25, detail: operationalDetail },
      transparency: { score: transparencyScore, maxScore: 10, detail: transparencyDetail },
    },
    computedAt: new Date().toISOString(),
  };
}

function computeRating(score: number): string {
  if (score >= 90) return "AAA";
  if (score >= 80) return "AA";
  if (score >= 70) return "A";
  if (score >= 60) return "BBB";
  if (score >= 50) return "BB";
  if (score >= 40) return "B";
  if (score >= 30) return "C";
  return "D";
}
