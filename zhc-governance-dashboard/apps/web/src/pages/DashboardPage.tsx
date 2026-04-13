import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ShieldCheck, Bot, GitBranch, Plug, AlertTriangle,
  Activity, CheckCircle2, XCircle, Clock,
  Plus, Zap, TrendingUp
} from 'lucide-react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ControlEvent {
  id: string;
  agentId: string | null;
  eventType: string;
  severity: 'info' | 'warning' | 'critical';
  resolvedAt: string | null;
  createdAt: string;
}

interface LeaderboardEntry {
  agentId: string;
  agentName: string;
  score: number;
  rating: string;
}

interface DashboardData {
  summary: {
    agents: number;
    processes: number;
    activeIntegrations: number;
    openAlerts: number;
  };
  governanceCoveragePercent: number;
  coveredAgents: number;
  totalAgents: number;
  recentEvents: ControlEvent[];
  traLeaderboard: LeaderboardEntry[];
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001';
const TENANT_ID = import.meta.env['VITE_DEMO_TENANT_ID'] ?? 'demo';
const api = axios.create({ baseURL: API_BASE, headers: { 'x-tenant-id': TENANT_ID } });

// ---------------------------------------------------------------------------
// Coverage gauge component
// ---------------------------------------------------------------------------

function CoverageGauge({ percent, covered, total }: { percent: number; covered: number; total: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  const color = percent >= 75 ? '#10b981' : percent >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
        <svg width="120" height="120" className="-rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{percent}%</span>
          <span className="text-[10px] text-gray-500">coverage</span>
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-white">Governance Coverage</p>
        <p className="text-xs text-gray-400">
          <span className="text-white font-medium">{covered}</span> of {total} agents fully covered
        </p>
        <p className="text-xs text-gray-500">
          {percent >= 75 ? '✓ Governance posture healthy' :
           percent >= 50 ? '⚠ Some agents need attention' :
           '✗ Coverage gaps require action'}
        </p>
        <div className="flex gap-2 mt-2">
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" /> Guardrails
          </span>
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block" /> HITL
          </span>
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="h-2 w-2 rounded-full bg-indigo-400 inline-block" /> HOTL
          </span>
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="h-2 w-2 rounded-full bg-red-400 inline-block" /> Emergency
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event feed
// ---------------------------------------------------------------------------

function EventFeed({ events }: { events: ControlEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-gray-600">
        No events in the last 30 days.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event) => {
        const Icon = event.severity === 'critical' ? XCircle :
                     event.severity === 'warning' ? AlertTriangle : CheckCircle2;
        const color = event.severity === 'critical' ? 'text-red-400' :
                      event.severity === 'warning' ? 'text-amber-400' : 'text-cyan-400';

        return (
          <div key={event.id} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
            <Icon className={clsx('h-3.5 w-3.5 flex-shrink-0', color)} />
            <span className="text-sm text-white flex-1 truncate">
              {formatEventType(event.eventType)}
            </span>
            <span className="text-xs text-gray-600 flex-shrink-0 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(event.createdAt)}
            </span>
            {event.resolvedAt ? (
              <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">resolved</span>
            ) : event.severity === 'critical' ? (
              <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-full">open</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TRA Leaderboard
// ---------------------------------------------------------------------------

const RATING_COLORS: Record<string, string> = {
  AAA: 'text-emerald-400', AA: 'text-emerald-400', A: 'text-green-400',
  BBB: 'text-amber-400', BB: 'text-amber-400', B: 'text-orange-400',
  C: 'text-red-400', D: 'text-red-600',
};

function TraLeaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-gray-600">
        No TRA scores yet. Run an assessment from the Agents page.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {entries.map((entry, idx) => (
        <div key={entry.agentId} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
          <span className={clsx(
            'text-xs font-bold w-5 text-center',
            idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-orange-700' : 'text-gray-600',
          )}>
            {idx + 1}
          </span>
          <Bot className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <span className="text-sm text-white flex-1 truncate">{entry.agentName}</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full', entry.score >= 70 ? 'bg-emerald-400' : entry.score >= 50 ? 'bg-amber-400' : 'bg-red-400')}
                style={{ width: `${entry.score}%` }}
              />
            </div>
            <span className="text-xs text-gray-300 w-8 text-right">{entry.score}</span>
            <span className={clsx('text-xs font-bold w-8 text-right', RATING_COLORS[entry.rating] ?? 'text-gray-400')}>
              {entry.rating}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/api/dashboard').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const stats = [
    { label: 'Agents', value: data?.summary.agents ?? '—', icon: Bot, color: 'text-cyan-400', to: '/agents' },
    { label: 'Processes', value: data?.summary.processes ?? '—', icon: GitBranch, color: 'text-indigo-400', to: '/processes' },
    { label: 'Active Integrations', value: data?.summary.activeIntegrations ?? '—', icon: Plug, color: 'text-emerald-400', to: '/integrations' },
    { label: 'Open Alerts', value: data?.summary.openAlerts ?? '—', icon: AlertTriangle, color: 'text-amber-400', to: '/agents' },
  ];

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Governance Overview</h1>
          <p className="mt-1 text-sm text-gray-400">
            Monitor AI agent governance controls across your organisation.
          </p>
        </div>
        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/agents')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add Agent
          </button>
          <button onClick={() => navigate('/integrations')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 transition-colors">
            <Plug className="h-3.5 w-3.5" />
            Connect Tool
          </button>
          <button onClick={() => navigate('/agents')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold transition-colors">
            <Zap className="h-3.5 w-3.5" />
            Run TRA
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map(({ label, value, icon: Icon, color, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="rounded-xl bg-white/[0.03] border border-white/8 p-4 flex items-center gap-3 hover:bg-white/[0.06] transition-colors text-left"
          >
            <div className={clsx('flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 flex-shrink-0', color)}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{isLoading ? '—' : value}</p>
              <p className="text-[11px] text-gray-500">{label}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Coverage gauge */}
        <div className="rounded-xl bg-white/[0.03] border border-white/8 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-medium text-white">Governance Coverage</h2>
          </div>
          {isLoading ? (
            <p className="text-xs text-gray-500">Loading…</p>
          ) : (
            <CoverageGauge
              percent={data?.governanceCoveragePercent ?? 0}
              covered={data?.coveredAgents ?? 0}
              total={data?.totalAgents ?? 0}
            />
          )}
        </div>

        {/* TRA leaderboard */}
        <div className="rounded-xl bg-white/[0.03] border border-white/8 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-medium text-white">TRA Score Leaderboard</h2>
          </div>
          {isLoading ? (
            <p className="text-xs text-gray-500">Loading…</p>
          ) : (
            <TraLeaderboard entries={data?.traLeaderboard ?? []} />
          )}
        </div>
      </div>

      {/* Recent events */}
      <div className="rounded-xl bg-white/[0.03] border border-white/8 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-medium text-white">Recent Control Events</h2>
          <span className="ml-auto text-xs text-gray-500">Last 30 days</span>
        </div>
        {isLoading ? (
          <p className="text-xs text-gray-500">Loading…</p>
        ) : (
          <EventFeed events={data?.recentEvents ?? []} />
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
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function formatEventType(type: string): string {
  return type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
