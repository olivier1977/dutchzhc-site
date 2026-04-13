/**
 * Seed data for local development and testing.
 * Usage: npm run db:seed
 *
 * Creates:
 *   - 1 demo tenant (DutchZHC)
 *   - 3 agents (CEO, Founding Engineer, MarCom Creative)
 *   - 2 processes (governance pipeline, token transfer)
 *   - governance integrations (Paperclip + Langfuse)
 *   - identity records with mock DID/VC
 *   - reputation scores
 */

import { getDb, closeDb } from "./index.js";
import {
  tenants,
  agents,
  processes,
  governanceIntegrations,
  identityRecords,
  reputationScores,
} from "./schema.js";

async function seed() {
  const db = getDb();

  console.log("Seeding database...");

  // ---- Tenant ----
  const [tenant] = await db
    .insert(tenants)
    .values({
      name: "DutchZHC",
      slug: "dutchzhc",
      plan: "pro",
    })
    .onConflictDoNothing()
    .returning();

  if (!tenant) {
    console.log("Tenant already exists, skipping seed.");
    await closeDb();
    return;
  }

  console.log("Created tenant:", tenant.id);

  // ---- Agents ----
  const [ceo, foundingEngineer, marcomCreative] = await db
    .insert(agents)
    .values([
      {
        tenantId: tenant.id,
        name: "CEO Agent",
        role: "ai_agent",
        did: "did:web:governance.dutchzhc.com:agents:ceo",
        status: "active",
      },
      {
        tenantId: tenant.id,
        name: "Founding Engineer",
        role: "ai_agent",
        did: "did:web:governance.dutchzhc.com:agents:founding-engineer",
        status: "active",
      },
      {
        tenantId: tenant.id,
        name: "MarCom Creative",
        role: "ai_agent",
        did: "did:web:governance.dutchzhc.com:agents:marcom-creative",
        status: "active",
      },
    ])
    .returning();

  console.log("Created agents:", [ceo, foundingEngineer, marcomCreative].map((a) => a?.name));

  // ---- Processes ----
  const [govPipeline, tokenTransfer] = await db
    .insert(processes)
    .values([
      {
        tenantId: tenant.id,
        name: "Governance Pipeline",
        description: "End-to-end AI agent governance workflow with HITL checkpoints",
        config: {
          steps: [
            { id: "ingest", agentRole: "founding_engineer", type: "task_intake" },
            { id: "execute", agentRole: "ai_agent", type: "execution" },
            { id: "review", agentRole: "human", type: "hitl_approval" },
            { id: "deploy", agentRole: "ai_agent", type: "deployment" },
          ],
        },
        status: "active",
      },
      {
        tenantId: tenant.id,
        name: "ZHR Token Transfer",
        description: "Safe multi-sig token transfer proposal and execution",
        config: {
          steps: [
            { id: "propose", agentRole: "founding_engineer", type: "proposal" },
            { id: "approve", agentRole: "human", type: "multisig_approval" },
            { id: "execute", agentRole: "ai_agent", type: "on_chain_execution" },
          ],
        },
        status: "active",
      },
    ])
    .returning();

  console.log("Created processes:", [govPipeline, tokenTransfer].map((p) => p?.name));

  // ---- Governance Integrations ----
  if (foundingEngineer && govPipeline) {
    await db.insert(governanceIntegrations).values([
      {
        tenantId: tenant.id,
        agentId: foundingEngineer.id,
        toolName: "paperclip",
        config: { url: "https://app.paperclip.ing", companyId: "demo" },
        status: "connected",
        lastSyncedAt: new Date(),
      },
      {
        tenantId: tenant.id,
        processId: govPipeline.id,
        toolName: "langfuse",
        config: { projectId: "zhcgov-demo", publicKey: "pk_demo" },
        status: "connected",
        lastSyncedAt: new Date(),
      },
    ]);
    console.log("Created governance integrations.");
  }

  // ---- Identity Records ----
  if (foundingEngineer) {
    await db.insert(identityRecords).values({
      tenantId: tenant.id,
      agentId: foundingEngineer.id,
      did: "did:web:governance.dutchzhc.com:agents:founding-engineer",
      vcJson: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential", "AgentGovernanceCredential"],
        issuer: "did:web:governance.dutchzhc.com",
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: "did:web:governance.dutchzhc.com:agents:founding-engineer",
          role: "founding_engineer",
          tenant: "DutchZHC",
          capabilities: ["code", "deploy", "governance_audit"],
        },
      },
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    });
    console.log("Created identity record for Founding Engineer.");
  }

  // ---- Reputation Scores ----
  const agentList = [ceo, foundingEngineer, marcomCreative].filter(Boolean);
  for (const agent of agentList) {
    if (!agent) continue;
    await db.insert(reputationScores).values({
      tenantId: tenant.id,
      agentId: agent.id,
      score: (75 + Math.random() * 20).toFixed(2),
      components: {
        governance: Math.floor(70 + Math.random() * 25),
        identity: Math.floor(80 + Math.random() * 15),
        reliability: Math.floor(65 + Math.random() * 30),
        transparency: Math.floor(75 + Math.random() * 20),
      },
      version: 1,
      computedAt: new Date(),
    });
  }
  console.log("Created reputation scores.");

  await closeDb();
  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
