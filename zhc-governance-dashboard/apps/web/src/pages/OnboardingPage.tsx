/**
 * Onboarding wizard — invite link → create workspace → add first agent → guided first step.
 * Route: /onboarding
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Shield, Building2, Bot, Zap, CheckCircle2, ArrowRight,
  Plug, AlertCircle, Loader2
} from 'lucide-react';
import clsx from 'clsx';

const API_BASE = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001';
const api = axios.create({ baseURL: API_BASE });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OnboardingState {
  step: 1 | 2 | 3 | 4;
  tenantId: string | null;
  agentId: string | null;
  workspaceName: string;
  workspaceSlug: string;
  agentName: string;
  agentRole: 'ai_agent' | 'human';
  agentDid: string;
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEPS = [
  { label: 'Welcome', icon: Shield },
  { label: 'Workspace', icon: Building2 },
  { label: 'First Agent', icon: Bot },
  { label: "Let's go", icon: Zap },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, idx) => {
        const n = idx + 1;
        const done = n < current;
        const active = n === current;
        const Icon = s.icon;
        return (
          <div key={n} className="flex items-center gap-2">
            <div className={clsx(
              'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors',
              done ? 'bg-emerald-400 text-black' :
              active ? 'bg-cyan-500 text-black' :
              'bg-white/5 text-gray-600',
            )}>
              {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <span className={clsx(
              'text-xs font-medium hidden sm:block',
              active ? 'text-white' : done ? 'text-emerald-400' : 'text-gray-600',
            )}>
              {s.label}
            </span>
            {idx < STEPS.length - 1 && (
              <div className={clsx('w-8 h-px', done ? 'bg-emerald-400/40' : 'bg-white/10')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

function Step1Welcome({ onNext, inviteToken }: { onNext: () => void; inviteToken: string | null }) {
  return (
    <div className="text-center space-y-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mx-auto">
        <Shield className="h-8 w-8 text-cyan-400" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome to ZHC Governance</h1>
        <p className="text-gray-400 mt-2 text-sm max-w-md mx-auto">
          The governance dashboard for Zero-Human Companies. Set up your workspace, register
          agents, connect governance tools, and get TRA scores in minutes.
        </p>
      </div>
      {inviteToken && (
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/5 border border-emerald-400/15 rounded-xl px-4 py-3 justify-center">
          <CheckCircle2 className="h-4 w-4" />
          Invite link validated — ready to set up your workspace
        </div>
      )}
      <button
        onClick={onNext}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold transition-colors mx-auto"
      >
        Get started <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Step2Workspace({
  name, setName, slug, setSlug, onNext, loading, error,
}: {
  name: string; setName: (v: string) => void;
  slug: string; setSlug: (v: string) => void;
  onNext: () => void; loading: boolean; error: string | null;
}) {
  const autoSlug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Create your workspace</h2>
        <p className="text-sm text-gray-400 mt-1">This is your governance dashboard for your ZHC.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Organisation name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slug || slug === autoSlug(name)) setSlug(autoSlug(e.target.value));
            }}
            placeholder="DutchZHC"
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Workspace slug</label>
          <div className="flex items-center rounded-xl bg-white/5 border border-white/10 overflow-hidden focus-within:border-cyan-500/50">
            <span className="px-3 py-2.5 text-xs text-gray-600 bg-white/5 border-r border-white/10 flex-shrink-0">
              governance.dutchzhc.com/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="dutchzhc"
              className="flex-1 px-3 py-2.5 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
            />
          </div>
          <p className="text-[10px] text-gray-600 mt-1">Lowercase letters, numbers, and hyphens only.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/5 border border-red-400/15 rounded-xl px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={onNext}
        disabled={loading || !name || !slug}
        className="flex items-center gap-2 w-full justify-center px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold transition-colors"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {loading ? 'Creating workspace…' : 'Create workspace'}
      </button>
    </div>
  );
}

function Step3Agent({
  agentName, setAgentName, role, setRole, did, setDid,
  onNext, onSkip, loading, error,
}: {
  agentName: string; setAgentName: (v: string) => void;
  role: 'ai_agent' | 'human'; setRole: (v: 'ai_agent' | 'human') => void;
  did: string; setDid: (v: string) => void;
  onNext: () => void; onSkip: () => void;
  loading: boolean; error: string | null;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Add your first agent</h2>
        <p className="text-sm text-gray-400 mt-1">Register the first AI agent or human operator to govern.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Agent name</label>
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="CEO Agent"
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Role</label>
          <div className="flex gap-2">
            {(['ai_agent', 'human'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={clsx(
                  'flex-1 py-2 rounded-xl text-xs font-medium border transition-colors',
                  role === r
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10',
                )}
              >
                {r === 'ai_agent' ? 'AI Agent' : 'Human Operator'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">
            DID <span className="text-gray-600">(optional)</span>
          </label>
          <input
            type="text"
            value={did}
            onChange={(e) => setDid(e.target.value)}
            placeholder="did:web:governance.dutchzhc.com:agents:ceo"
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 font-mono text-xs"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/5 border border-red-400/15 rounded-xl px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onSkip}
          className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-gray-400 hover:bg-white/5 transition-colors"
        >
          Skip for now
        </button>
        <button
          onClick={onNext}
          disabled={loading || !agentName}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold transition-colors"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {loading ? 'Adding…' : 'Add agent'}
        </button>
      </div>
    </div>
  );
}

function Step4Done({
  workspaceName, agentName, tenantId, onFinish,
}: {
  workspaceName: string; agentName: string | null; tenantId: string; onFinish: () => void;
}) {
  return (
    <div className="text-center space-y-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/10 border border-emerald-400/20 mx-auto">
        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white">You're all set!</h2>
        <p className="text-gray-400 mt-2 text-sm">
          Workspace <span className="text-white font-medium">{workspaceName}</span> is ready.
          {agentName && <> Agent <span className="text-white font-medium">{agentName}</span> added.</>}
        </p>
      </div>

      <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 text-left space-y-2">
        <p className="text-xs font-semibold text-gray-400 mb-3">Suggested next steps</p>
        <div className="flex items-start gap-3">
          <Plug className="h-4 w-4 text-cyan-400 mt-0.5" />
          <div>
            <p className="text-sm text-white">Connect Paperclip</p>
            <p className="text-xs text-gray-500">Add HITL approval gates — essential for governance.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Zap className="h-4 w-4 text-amber-400 mt-0.5" />
          <div>
            <p className="text-sm text-white">Run a TRA Assessment</p>
            <p className="text-xs text-gray-500">Get your first TRA score and shareable badge.</p>
          </div>
        </div>
      </div>

      <button
        onClick={onFinish}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold transition-colors mx-auto"
      >
        Open Dashboard <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main onboarding wizard
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [state, setState] = useState<OnboardingState>({
    step: 1,
    tenantId: null,
    agentId: null,
    workspaceName: '',
    workspaceSlug: '',
    agentName: '',
    agentRole: 'ai_agent',
    agentDid: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate invite token on mount
  useEffect(() => {
    if (inviteToken) {
      api.get(`/api/onboarding/invite/${inviteToken}`).catch(() => null);
    }
  }, [inviteToken]);

  const handleCreateWorkspace = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/onboarding/workspace', {
        name: state.workspaceName,
        slug: state.workspaceSlug,
        inviteToken: inviteToken ?? undefined,
      });
      setState((s) => ({ ...s, step: 3, tenantId: res.data.tenant.id }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create workspace';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAgent = async () => {
    if (!state.tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/api/tenants/${state.tenantId}/agents`, {
        name: state.agentName,
        role: state.agentRole,
        did: state.agentDid || undefined,
      });
      setState((s) => ({ ...s, step: 4, agentId: res.data.id }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to add agent';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex flex-col">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Shield className="h-5 w-5 text-cyan-400" />
          <span className="text-sm font-semibold text-gray-300">ZHC Governance</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          {/* Step indicator */}
          <div className="flex justify-center mb-10">
            <StepIndicator current={state.step} />
          </div>

          {/* Step content */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-8">
            {state.step === 1 && (
              <Step1Welcome
                onNext={() => setState((s) => ({ ...s, step: 2 }))}
                inviteToken={inviteToken}
              />
            )}
            {state.step === 2 && (
              <Step2Workspace
                name={state.workspaceName}
                setName={(v) => setState((s) => ({ ...s, workspaceName: v }))}
                slug={state.workspaceSlug}
                setSlug={(v) => setState((s) => ({ ...s, workspaceSlug: v }))}
                onNext={handleCreateWorkspace}
                loading={loading}
                error={error}
              />
            )}
            {state.step === 3 && (
              <Step3Agent
                agentName={state.agentName}
                setAgentName={(v) => setState((s) => ({ ...s, agentName: v }))}
                role={state.agentRole}
                setRole={(v) => setState((s) => ({ ...s, agentRole: v }))}
                did={state.agentDid}
                setDid={(v) => setState((s) => ({ ...s, agentDid: v }))}
                onNext={handleAddAgent}
                onSkip={() => setState((s) => ({ ...s, step: 4 }))}
                loading={loading}
                error={error}
              />
            )}
            {state.step === 4 && (
              <Step4Done
                workspaceName={state.workspaceName}
                agentName={state.agentName || null}
                tenantId={state.tenantId!}
                onFinish={handleFinish}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
