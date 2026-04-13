import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Bot, Plus, Shield, KeyRound, Activity, ChevronRight,
  AlertTriangle, CheckCircle2, Clock, XCircle, Fingerprint,
  ShieldAlert, Zap, Eye
} from 'lucide-react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Types (mirrors API schema)
// ---------------------------------------------------------------------------

interface Agent {
  id: string;
  name: string;
  role: string;
  did: string | null;
  status: 'active' | 'suspended' | 'decommissioned';
  createdAt: string;
}

interface IdentityRecord {
  id: string;
  did: string;
  issuedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  vcJson: Record<string, unknown> | null;
}

interface ControlEvent {
  id: string;
  eventType: string;
  severity: 'info' | 'warning' | 'critical';
  payload: Record<string, unknown> | null;
  resolvedAt: string | null;
  createdAt: string;
}

type CoverageStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';

interface GovernanceData {
  agent: Agent;
  identity: IdentityRecord | null;
  latestScore: { score: string; components: Record<string, number> } | null;
  controlCoverage: {
    guardrails: CoverageStatus;
    hitl: CoverageStatus;
    hotl: CoverageStatus;
    emergency: CoverageStatus;
  };
  recentEvents: ControlEvent[];
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001';
const TENANT_ID = import.meta.env['VITE_DEMO_TENANT_ID'] ?? 'demo';

const api = axios.create({ baseURL: API_BASE, headers: { 'x-tenant-id': TENANT_ID } });

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: CoverageStatus }) {
  const colors: Record<CoverageStatus, string> = {
    healthy: 'bg-emerald-400',
    degraded: 'bg-amber-400',
    critical: 'bg-red-400',
    unknown: 'bg-gray-500',
  };
  return (
    <span className={clsx('inline-block h-2 w-2 rounded-full', colors[status])} />
  );
}

function ControlRow({
  icon: Icon,
  label,
  status,
  description,
}: {
  icon: React.ElementType;
  label: string;
  status: CoverageStatus;
  description: string;
}) {
  const statusLabels: Record<CoverageStatus, string> = {
    healthy: 'Active',
    degraded: 'Degraded',
    critical: 'Critical',
    unknown: 'Not configured',
  };
  const textColors: Record<CoverageStatus, string> = {
    healthy: 'text-emerald-400',
    degraded: 'text-amber-400',
    critical: 'text-red-400',
    unknown: 'text-gray-500',
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
        <Icon className="h-3.5 w-3.5 text-cyan-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-white">{label}</span>
          <span className={clsx('text-xs font-medium flex items-center gap-1.5', textColors[status])}>
            <StatusDot status={status} />
            {statusLabels[status]}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function EventRow({ event }: { event: ControlEvent }) {
  const icons = {
    info: CheckCircle2,
    warning: AlertTriangle,
    critical: XCircle,
  };
  const colors = {
    info: 'text-cyan-400',
    warning: 'text-amber-400',
    critical: 'text-red-400',
  };
  const Icon = icons[event.severity];

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      <Icon className={clsx('h-4 w-4 mt-0.5 flex-shrink-0', colors[event.severity])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{formatEventType(event.eventType)}</p>
        {event.payload?.message && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{String(event.payload.message)}</p>
        )}
      </div>
      <span className="text-xs text-gray-600 flex-shrink-0 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {formatDate(event.createdAt)}
      </span>
    </div>
  );
}

function AgentCard({
  agent,
  isSelected,
  onClick,
}: {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusColor = agent.status === 'active' ? 'bg-emerald-400' : agent.status === 'suspended' ? 'bg-amber-400' : 'bg-gray-500';

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
        isSelected ? 'bg-cyan-500/10 border border-cyan-500/20' : 'hover:bg-white/5 border border-transparent',
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 flex-shrink-0">
        <Bot className="h-4 w-4 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{agent.name}</p>
        <p className="text-xs text-gray-500 truncate">{agent.did ?? 'No DID'}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={clsx('h-2 w-2 rounded-full', statusColor)} />
        <ChevronRight className={clsx('h-4 w-4 transition-colors', isSelected ? 'text-cyan-400' : 'text-gray-600')} />
      </div>
    </button>
  );
}

function GovernancePanel({ agentId }: { agentId: string }) {
  const { data, isLoading, error } = useQuery<GovernanceData>({
    queryKey: ['agent-governance', agentId],
    queryFn: () => api.get(`/api/agents/${agentId}/governance`).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        Loading governance data…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400 text-sm gap-2">
        <XCircle className="h-4 w-4" />
        Failed to load governance data
      </div>
    );
  }

  const { agent, identity, latestScore, controlCoverage, recentEvents } = data;

  const overallStatus: CoverageStatus = (() => {
    const values = Object.values(controlCoverage);
    if (values.includes('critical')) return 'critical';
    if (values.includes('degraded')) return 'degraded';
    if (values.every((v) => v === 'healthy')) return 'healthy';
    return 'unknown';
  })();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{agent.name}</h2>
          <p className="text-xs text-gray-500 mt-0.5 capitalize">{agent.role.replace('_', ' ')}</p>
        </div>
        <div className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
          overallStatus === 'healthy' ? 'bg-emerald-400/10 text-emerald-400' :
          overallStatus === 'degraded' ? 'bg-amber-400/10 text-amber-400' :
          overallStatus === 'critical' ? 'bg-red-400/10 text-red-400' :
          'bg-gray-500/10 text-gray-400',
        )}>
          <StatusDot status={overallStatus} />
          {overallStatus === 'healthy' ? 'Governance OK' :
           overallStatus === 'degraded' ? 'Needs Attention' :
           overallStatus === 'critical' ? 'Critical Issues' : 'Incomplete'}
        </div>
      </div>

      {/* Identity Card */}
      <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Fingerprint className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-medium text-white">Identity</h3>
        </div>

        {identity ? (
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">DID</p>
              <code className="text-xs text-cyan-300 font-mono break-all bg-white/5 px-2 py-1 rounded block">
                {identity.did}
              </code>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
              <span>Issued: {identity.issuedAt ? formatDate(identity.issuedAt) : '—'}</span>
              <span className={clsx(
                'flex items-center gap-1',
                identity.revokedAt ? 'text-red-400' :
                identity.expiresAt && new Date(identity.expiresAt) < new Date() ? 'text-amber-400' :
                'text-emerald-400',
              )}>
                {identity.revokedAt ? <><XCircle className="h-3 w-3" /> Revoked</> :
                 identity.expiresAt && new Date(identity.expiresAt) < new Date() ? <><AlertTriangle className="h-3 w-3" /> Expired</> :
                 <><CheckCircle2 className="h-3 w-3" /> Valid</>}
              </span>
            </div>
            {identity.vcJson && (
              <div className="mt-2 pt-2 border-t border-white/5">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Verifiable Credential attached
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
            <KeyRound className="h-4 w-4" />
            <span>No DID/VC configured</span>
          </div>
        )}
      </div>

      {/* TRA Score */}
      {latestScore && (
        <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-medium text-white">TRA Score</h3>
            </div>
            <span className="text-2xl font-bold text-white">{parseFloat(latestScore.score).toFixed(0)}</span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(latestScore.components).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-24 capitalize">{key}</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-full',
                      value >= 80 ? 'bg-emerald-400' : value >= 60 ? 'bg-amber-400' : 'bg-red-400',
                    )}
                    style={{ width: `${value}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-8 text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Governance Controls */}
      <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-medium text-white">Governance Controls</h3>
        </div>
        <ControlRow
          icon={Shield}
          label="Guardrails"
          status={controlCoverage.guardrails}
          description="Input/output filters, topic restrictions, policy enforcement"
        />
        <ControlRow
          icon={CheckCircle2}
          label="Human-in-the-Loop (HITL)"
          status={controlCoverage.hitl}
          description="Approval checkpoints for high-impact actions"
        />
        <ControlRow
          icon={Eye}
          label="Human-on-the-Loop (HOTL)"
          status={controlCoverage.hotl}
          description="Passive observability — traces, logs, anomaly alerts"
        />
        <ControlRow
          icon={Zap}
          label="Emergency Break"
          status={controlCoverage.emergency}
          description="Kill-switch and override capability for this agent"
        />
      </div>

      {/* Control Event Log */}
      <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-medium text-white">Control Events</h3>
          <span className="ml-auto text-xs text-gray-500">Last 30 days</span>
        </div>

        {recentEvents.length === 0 ? (
          <p className="text-xs text-gray-500 py-2">No control events in the last 30 days.</p>
        ) : (
          recentEvents.map((event) => <EventRow key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AgentsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: agentList = [], isLoading } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => api.get('/api/agents').then((r) => r.data),
  });

  const selectedAgent = agentList.find((a) => a.id === selectedId);

  return (
    <div className="flex h-full">
      {/* Agent list sidebar */}
      <div className="flex w-72 flex-col border-r border-white/[0.06] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/[0.06]">
          <div>
            <h1 className="text-base font-semibold text-white">Agents</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {agentList.length} registered
            </p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>

        <div className="flex-1 p-3 space-y-1">
          {isLoading && (
            <p className="text-xs text-gray-500 text-center py-6">Loading agents…</p>
          )}
          {!isLoading && agentList.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10">
              <Bot className="h-8 w-8 text-gray-600" />
              <p className="text-xs text-gray-500">No agents yet</p>
            </div>
          )}
          {agentList.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={agent.id === selectedId}
              onClick={() => setSelectedId(agent.id === selectedId ? null : agent.id)}
            />
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedAgent ? (
          <GovernancePanel agentId={selectedAgent.id} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Shield className="h-12 w-12 text-gray-700" />
            <h2 className="text-base font-medium text-gray-400">Select an agent</h2>
            <p className="text-sm text-gray-600 max-w-xs">
              Choose an agent from the list to view its DID, VC, governance controls, and control event log.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function formatEventType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
