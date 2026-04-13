import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  GitBranch, Plus, ChevronRight, AlertTriangle, CheckCircle2,
  Shield, Eye, Zap, ArrowRight, Info, AlertCircle
} from 'lucide-react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Process {
  id: string;
  name: string;
  description: string | null;
  status: string;
  config: {
    steps?: PipelineStep[];
  } | null;
  createdAt: string;
}

interface PipelineStep {
  id: string;
  agentRole: string;
  type: string;
  agentId?: string;
  description?: string;
}

type CoverageStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';

interface StepCoverage {
  step: PipelineStep;
  coverage: {
    guardrails: CoverageStatus;
    hitl: CoverageStatus;
    hotl: CoverageStatus;
    emergency: CoverageStatus;
  };
  gaps: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

interface HeatmapData {
  processId: string;
  overallStatus: CoverageStatus;
  totalGaps: number;
  stepCoverage: StepCoverage[];
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001';
const TENANT_ID = import.meta.env['VITE_DEMO_TENANT_ID'] ?? 'demo';
const api = axios.create({ baseURL: API_BASE, headers: { 'x-tenant-id': TENANT_ID } });

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CoverageCell({ status }: { status: CoverageStatus }) {
  const cfg: Record<CoverageStatus, { bg: string; icon: React.ElementType; title: string }> = {
    healthy: { bg: 'bg-emerald-400/20', icon: CheckCircle2, title: 'Active' },
    degraded: { bg: 'bg-amber-400/20', icon: AlertTriangle, title: 'Degraded' },
    critical: { bg: 'bg-red-400/20', icon: AlertCircle, title: 'Critical' },
    unknown: { bg: 'bg-white/5', icon: Info, title: 'Not configured' },
  };
  const textColors: Record<CoverageStatus, string> = {
    healthy: 'text-emerald-400',
    degraded: 'text-amber-400',
    critical: 'text-red-400',
    unknown: 'text-gray-600',
  };
  const { bg, icon: Icon, title } = cfg[status];
  return (
    <div className={clsx('flex items-center justify-center rounded p-1.5', bg)} title={title}>
      <Icon className={clsx('h-3.5 w-3.5', textColors[status])} />
    </div>
  );
}

function StepTypeIcon({ type }: { type: string }) {
  if (type.includes('hitl') || type.includes('multisig')) return <CheckCircle2 className="h-4 w-4 text-cyan-400" />;
  if (type.includes('intake')) return <GitBranch className="h-4 w-4 text-indigo-400" />;
  if (type.includes('deploy') || type.includes('chain')) return <Zap className="h-4 w-4 text-orange-400" />;
  return <Shield className="h-4 w-4 text-gray-400" />;
}

function RiskBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const cfg = {
    low: 'bg-emerald-400/10 text-emerald-400',
    medium: 'bg-amber-400/10 text-amber-400',
    high: 'bg-red-400/10 text-red-400',
  };
  return (
    <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide', cfg[level])}>
      {level} risk
    </span>
  );
}

function PipelineMap({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-2">
      {steps.map((step, idx) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5 min-w-[100px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10">
              <StepTypeIcon type={step.type} />
            </div>
            <span className="text-[10px] text-gray-400 text-center max-w-[90px] leading-tight">
              {formatStepType(step.type)}
            </span>
            <span className="text-[9px] text-gray-600 text-center max-w-[90px]">
              {step.agentRole.replace('_', ' ')}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <ArrowRight className="h-4 w-4 text-gray-700 mx-1 flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

function GovernanceHeatmap({ processId }: { processId: string }) {
  const { data, isLoading } = useQuery<HeatmapData>({
    queryKey: ['process-heatmap', processId],
    queryFn: () => api.get(`/api/processes/${processId}/governance-heatmap`).then((r) => r.data),
  });

  if (isLoading) return <p className="text-xs text-gray-500 py-4">Loading heatmap…</p>;
  if (!data) return null;

  const controls: Array<{ key: keyof StepCoverage['coverage']; label: string; icon: React.ElementType }> = [
    { key: 'guardrails', label: 'Guardrails', icon: Shield },
    { key: 'hitl', label: 'HITL', icon: CheckCircle2 },
    { key: 'hotl', label: 'HOTL', icon: Eye },
    { key: 'emergency', label: 'Emergency', icon: Zap },
  ];

  const allGaps = data.stepCoverage.flatMap((s) => s.gaps.map((g) => ({ step: s.step.id, gap: g })));

  return (
    <div className="space-y-4">
      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-gray-500 font-medium pb-2 pr-4 w-32">Step</th>
              {controls.map(({ label, icon: Icon }) => (
                <th key={label} className="text-center text-gray-500 font-medium pb-2 px-2">
                  <div className="flex items-center justify-center gap-1">
                    <Icon className="h-3 w-3" />
                    {label}
                  </div>
                </th>
              ))}
              <th className="text-center text-gray-500 font-medium pb-2 px-2">Risk</th>
            </tr>
          </thead>
          <tbody>
            {data.stepCoverage.map(({ step, coverage, riskLevel }) => (
              <tr key={step.id} className="border-t border-white/5">
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <StepTypeIcon type={step.type} />
                    <span className="text-white truncate max-w-[100px]">{formatStepType(step.type)}</span>
                  </div>
                </td>
                {controls.map(({ key }) => (
                  <td key={key} className="py-2 px-2 text-center">
                    <div className="flex justify-center">
                      <CoverageCell status={coverage[key]} />
                    </div>
                  </td>
                ))}
                <td className="py-2 px-2 text-center">
                  <div className="flex justify-center">
                    <RiskBadge level={riskLevel} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Gap analysis */}
      {allGaps.length > 0 && (
        <div className="rounded-xl bg-amber-400/5 border border-amber-400/15 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h4 className="text-sm font-medium text-white">
              Gap Analysis — {allGaps.length} issue{allGaps.length !== 1 ? 's' : ''} found
            </h4>
          </div>
          <ul className="space-y-1.5">
            {allGaps.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>
                  <span className="text-gray-500">[{item.step}]</span> {item.gap}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {allGaps.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/5 border border-emerald-400/15 rounded-xl p-3">
          <CheckCircle2 className="h-4 w-4" />
          All pipeline steps have full governance coverage.
        </div>
      )}
    </div>
  );
}

function ProcessCard({
  process,
  isSelected,
  onClick,
}: {
  process: Process;
  isSelected: boolean;
  onClick: () => void;
}) {
  const stepCount = process.config?.steps?.length ?? 0;
  const statusColor = process.status === 'active' ? 'bg-emerald-400' : 'bg-gray-500';

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
        isSelected ? 'bg-cyan-500/10 border border-cyan-500/20' : 'hover:bg-white/5 border border-transparent',
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 flex-shrink-0">
        <GitBranch className="h-4 w-4 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{process.name}</p>
        <p className="text-xs text-gray-500">{stepCount} step{stepCount !== 1 ? 's' : ''}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={clsx('h-2 w-2 rounded-full', statusColor)} />
        <ChevronRight className={clsx('h-4 w-4 transition-colors', isSelected ? 'text-cyan-400' : 'text-gray-600')} />
      </div>
    </button>
  );
}

function ProcessDetail({ process }: { process: Process }) {
  const steps = process.config?.steps ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-white">{process.name}</h2>
        {process.description && (
          <p className="text-sm text-gray-400 mt-1">{process.description}</p>
        )}
      </div>

      {/* Pipeline map */}
      <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-medium text-white">Pipeline Map</h3>
          <span className="ml-auto text-xs text-gray-500">{steps.length} steps</span>
        </div>
        {steps.length > 0 ? (
          <PipelineMap steps={steps} />
        ) : (
          <p className="text-xs text-gray-500">No steps defined for this process.</p>
        )}
      </div>

      {/* Governance heatmap + gap analysis */}
      <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-medium text-white">Governance Heatmap</h3>
        </div>
        {steps.length > 0 ? (
          <GovernanceHeatmap processId={process.id} />
        ) : (
          <p className="text-xs text-gray-500">No steps to analyze.</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ProcessesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: processList = [], isLoading } = useQuery<Process[]>({
    queryKey: ['processes'],
    queryFn: () => api.get('/api/processes').then((r) => r.data),
  });

  const selectedProcess = processList.find((p) => p.id === selectedId);

  return (
    <div className="flex h-full">
      {/* Process list sidebar */}
      <div className="flex w-72 flex-col border-r border-white/[0.06] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/[0.06]">
          <div>
            <h1 className="text-base font-semibold text-white">Processes</h1>
            <p className="text-xs text-gray-500 mt-0.5">{processList.length} defined</p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold transition-colors">
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>

        <div className="flex-1 p-3 space-y-1">
          {isLoading && <p className="text-xs text-gray-500 text-center py-6">Loading…</p>}
          {!isLoading && processList.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10">
              <GitBranch className="h-8 w-8 text-gray-600" />
              <p className="text-xs text-gray-500">No processes yet</p>
            </div>
          )}
          {processList.map((p) => (
            <ProcessCard
              key={p.id}
              process={p}
              isSelected={p.id === selectedId}
              onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
            />
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedProcess ? (
          <ProcessDetail process={selectedProcess} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <GitBranch className="h-12 w-12 text-gray-700" />
            <h2 className="text-base font-medium text-gray-400">Select a process</h2>
            <p className="text-sm text-gray-600 max-w-xs">
              Choose a process to view its pipeline map, governance heatmap, and gap analysis.
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

function formatStepType(type: string): string {
  const labels: Record<string, string> = {
    task_intake: 'Task Intake',
    execution: 'Execution',
    hitl_approval: 'HITL Approval',
    deployment: 'Deploy',
    on_chain_execution: 'On-Chain',
    proposal: 'Proposal',
    multisig_approval: 'Multi-sig',
  };
  return labels[type] ?? type.replace(/_/g, ' ');
}
