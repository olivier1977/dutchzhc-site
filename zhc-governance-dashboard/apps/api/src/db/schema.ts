/**
 * Drizzle ORM schema for the ZHC Governance Dashboard.
 *
 * Multi-tenant: every table (except `tenants`) has a `tenant_id` column.
 * Row-Level Security is enforced at the Postgres level via migrations.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  numeric,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// tenants
// ---------------------------------------------------------------------------

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  plan: text("plan").notNull().default("free"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => ({
  slugIdx: uniqueIndex("tenants_slug_idx").on(t.slug),
}));

// ---------------------------------------------------------------------------
// agents
// ---------------------------------------------------------------------------

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull().default("ai_agent"), // 'ai_agent' | 'human'
  did: text("did"),                                  // Decentralized Identifier
  status: text("status").notNull().default("active"), // 'active' | 'suspended' | 'decommissioned'
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => ({
  tenantIdx: index("agents_tenant_id_idx").on(t.tenantId),
  didIdx: index("agents_did_idx").on(t.did),
}));

// ---------------------------------------------------------------------------
// processes
// ---------------------------------------------------------------------------

export const processes = pgTable("processes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  config: jsonb("config"),  // pipeline definition (steps, dependencies, triggers)
  status: text("status").notNull().default("active"), // 'active' | 'archived'
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => ({
  tenantIdx: index("processes_tenant_id_idx").on(t.tenantId),
}));

// ---------------------------------------------------------------------------
// governance_integrations
// ---------------------------------------------------------------------------

export const governanceIntegrations = pgTable("governance_integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" }),
  processId: uuid("process_id")
    .references(() => processes.id, { onDelete: "cascade" }),
  toolName: text("tool_name").notNull(), // 'paperclip' | 'langfuse' | 'weights_biases' | ...
  config: jsonb("config"),               // tool-specific connection config (tokens stored encrypted)
  status: text("status").notNull().default("disconnected"), // 'connected' | 'disconnected' | 'error'
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => ({
  tenantIdx: index("gov_integrations_tenant_id_idx").on(t.tenantId),
  agentIdx: index("gov_integrations_agent_id_idx").on(t.agentId),
  toolIdx: index("gov_integrations_tool_name_idx").on(t.toolName),
}));

// ---------------------------------------------------------------------------
// control_events
// ---------------------------------------------------------------------------

export const controlEvents = pgTable("control_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "set null" }),
  processId: uuid("process_id")
    .references(() => processes.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(), // 'guardrail_triggered' | 'hitl_approval' | 'kill_switch' | 'override'
  severity: text("severity").notNull().default("info"), // 'info' | 'warning' | 'critical'
  payload: jsonb("payload"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => ({
  tenantIdx: index("control_events_tenant_id_idx").on(t.tenantId),
  agentIdx: index("control_events_agent_id_idx").on(t.agentId),
  eventTypeIdx: index("control_events_event_type_idx").on(t.eventType),
  createdAtIdx: index("control_events_created_at_idx").on(t.createdAt),
}));

// ---------------------------------------------------------------------------
// identity_records
// ---------------------------------------------------------------------------

export const identityRecords = pgTable("identity_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  did: text("did").notNull(),
  vcJson: jsonb("vc_json"),   // Verifiable Credential JSON-LD document
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => ({
  tenantIdx: index("identity_records_tenant_id_idx").on(t.tenantId),
  agentIdx: index("identity_records_agent_id_idx").on(t.agentId),
  didIdx: index("identity_records_did_idx").on(t.did),
}));

// ---------------------------------------------------------------------------
// reputation_scores
// ---------------------------------------------------------------------------

export const reputationScores = pgTable("reputation_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  score: numeric("score", { precision: 5, scale: 2 }).notNull(),
  components: jsonb("components"), // { governance: 80, identity: 95, reliability: 70, ... }
  version: integer("version").notNull().default(1),
  computedAt: timestamp("computed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => ({
  tenantIdx: index("reputation_scores_tenant_id_idx").on(t.tenantId),
  agentIdx: index("reputation_scores_agent_id_idx").on(t.agentId),
  // Latest score lookup
  agentVersionIdx: index("reputation_scores_agent_version_idx").on(t.agentId, t.version),
}));

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const tenantsRelations = relations(tenants, ({ many }) => ({
  agents: many(agents),
  processes: many(processes),
  governanceIntegrations: many(governanceIntegrations),
  controlEvents: many(controlEvents),
  identityRecords: many(identityRecords),
  reputationScores: many(reputationScores),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  tenant: one(tenants, { fields: [agents.tenantId], references: [tenants.id] }),
  governanceIntegrations: many(governanceIntegrations),
  controlEvents: many(controlEvents),
  identityRecords: many(identityRecords),
  reputationScores: many(reputationScores),
}));

export const processesRelations = relations(processes, ({ one, many }) => ({
  tenant: one(tenants, { fields: [processes.tenantId], references: [tenants.id] }),
  governanceIntegrations: many(governanceIntegrations),
  controlEvents: many(controlEvents),
}));

export const governanceIntegrationsRelations = relations(governanceIntegrations, ({ one }) => ({
  tenant: one(tenants, { fields: [governanceIntegrations.tenantId], references: [tenants.id] }),
  agent: one(agents, { fields: [governanceIntegrations.agentId], references: [agents.id] }),
  process: one(processes, { fields: [governanceIntegrations.processId], references: [processes.id] }),
}));

export const controlEventsRelations = relations(controlEvents, ({ one }) => ({
  tenant: one(tenants, { fields: [controlEvents.tenantId], references: [tenants.id] }),
  agent: one(agents, { fields: [controlEvents.agentId], references: [agents.id] }),
  process: one(processes, { fields: [controlEvents.processId], references: [processes.id] }),
}));

export const identityRecordsRelations = relations(identityRecords, ({ one }) => ({
  tenant: one(tenants, { fields: [identityRecords.tenantId], references: [tenants.id] }),
  agent: one(agents, { fields: [identityRecords.agentId], references: [agents.id] }),
}));

export const reputationScoresRelations = relations(reputationScores, ({ one }) => ({
  tenant: one(tenants, { fields: [reputationScores.tenantId], references: [tenants.id] }),
  agent: one(agents, { fields: [reputationScores.agentId], references: [agents.id] }),
}));
