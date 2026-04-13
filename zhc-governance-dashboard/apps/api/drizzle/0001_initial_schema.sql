-- =============================================================================
-- Migration: 0001_initial_schema
-- ZHC Governance Dashboard — initial multi-tenant schema with RLS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- tenants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tenants" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"       TEXT NOT NULL,
  "slug"       TEXT NOT NULL,
  "plan"       TEXT NOT NULL DEFAULT 'free',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenants_slug_idx" ON "tenants" ("slug");

-- ---------------------------------------------------------------------------
-- agents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "agents" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"  UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name"       TEXT NOT NULL,
  "role"       TEXT NOT NULL DEFAULT 'ai_agent',
  "did"        TEXT,
  "status"     TEXT NOT NULL DEFAULT 'active',
  "metadata"   JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "agents_tenant_id_idx" ON "agents" ("tenant_id");
CREATE INDEX IF NOT EXISTS "agents_did_idx"       ON "agents" ("did");

-- ---------------------------------------------------------------------------
-- processes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "processes" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"   UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "config"      JSONB,
  "status"      TEXT NOT NULL DEFAULT 'active',
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "processes_tenant_id_idx" ON "processes" ("tenant_id");

-- ---------------------------------------------------------------------------
-- governance_integrations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "governance_integrations" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"       UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "agent_id"        UUID REFERENCES "agents"("id") ON DELETE CASCADE,
  "process_id"      UUID REFERENCES "processes"("id") ON DELETE CASCADE,
  "tool_name"       TEXT NOT NULL,
  "config"          JSONB,
  "status"          TEXT NOT NULL DEFAULT 'disconnected',
  "last_synced_at"  TIMESTAMPTZ,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "gov_integrations_tenant_id_idx" ON "governance_integrations" ("tenant_id");
CREATE INDEX IF NOT EXISTS "gov_integrations_agent_id_idx"  ON "governance_integrations" ("agent_id");
CREATE INDEX IF NOT EXISTS "gov_integrations_tool_name_idx" ON "governance_integrations" ("tool_name");

-- ---------------------------------------------------------------------------
-- control_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "control_events" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "agent_id"     UUID REFERENCES "agents"("id") ON DELETE SET NULL,
  "process_id"   UUID REFERENCES "processes"("id") ON DELETE SET NULL,
  "event_type"   TEXT NOT NULL,
  "severity"     TEXT NOT NULL DEFAULT 'info',
  "payload"      JSONB,
  "resolved_at"  TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "control_events_tenant_id_idx"  ON "control_events" ("tenant_id");
CREATE INDEX IF NOT EXISTS "control_events_agent_id_idx"   ON "control_events" ("agent_id");
CREATE INDEX IF NOT EXISTS "control_events_event_type_idx" ON "control_events" ("event_type");
CREATE INDEX IF NOT EXISTS "control_events_created_at_idx" ON "control_events" ("created_at");

-- ---------------------------------------------------------------------------
-- identity_records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "identity_records" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"   UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "agent_id"    UUID NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "did"         TEXT NOT NULL,
  "vc_json"     JSONB,
  "issued_at"   TIMESTAMPTZ,
  "expires_at"  TIMESTAMPTZ,
  "revoked_at"  TIMESTAMPTZ,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "identity_records_tenant_id_idx" ON "identity_records" ("tenant_id");
CREATE INDEX IF NOT EXISTS "identity_records_agent_id_idx"  ON "identity_records" ("agent_id");
CREATE INDEX IF NOT EXISTS "identity_records_did_idx"       ON "identity_records" ("did");

-- ---------------------------------------------------------------------------
-- reputation_scores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "reputation_scores" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "agent_id"     UUID NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "score"        NUMERIC(5,2) NOT NULL,
  "components"   JSONB,
  "version"      INTEGER NOT NULL DEFAULT 1,
  "computed_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "reputation_scores_tenant_id_idx"      ON "reputation_scores" ("tenant_id");
CREATE INDEX IF NOT EXISTS "reputation_scores_agent_id_idx"       ON "reputation_scores" ("agent_id");
CREATE INDEX IF NOT EXISTS "reputation_scores_agent_version_idx"  ON "reputation_scores" ("agent_id", "version");

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- The application sets the local variable `app.current_tenant_id` at the
-- start of each request, and every policy checks against it.
-- ---------------------------------------------------------------------------

ALTER TABLE "agents"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "processes"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "governance_integrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "control_events"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity_records"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reputation_scores"       ENABLE ROW LEVEL SECURITY;

-- Agents RLS
CREATE POLICY "tenant_isolation" ON "agents"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Processes RLS
CREATE POLICY "tenant_isolation" ON "processes"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Governance integrations RLS
CREATE POLICY "tenant_isolation" ON "governance_integrations"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Control events RLS
CREATE POLICY "tenant_isolation" ON "control_events"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Identity records RLS
CREATE POLICY "tenant_isolation" ON "identity_records"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Reputation scores RLS
CREATE POLICY "tenant_isolation" ON "reputation_scores"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
