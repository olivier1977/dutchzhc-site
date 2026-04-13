import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Plug, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Clock, Wifi, WifiOff, ChevronDown, ChevronUp, Code
} from 'lucide-react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Integration {
  id: string;
  toolName: string;
  agentId: string | null;
  processId: string | null;
  config: Record<string, unknown> | null;
  status: 'connected' | 'disconnected' | 'error';
  lastSyncedAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Static tool catalog
// ---------------------------------------------------------------------------

interface ToolDef {
  name: string;
  toolName: string;
  category: 'Guardrail' | 'HITL' | 'HOTL / Observability' | 'Emergency Break';
  description: string;
  configFields: Array<{ key: string; label: string; placeholder: string; secret?: boolean }>;
}

const TOOL_CATALOG: ToolDef[] = [
  {
    name: 'Paperclip',
    toolName: 'paperclip',
    category: 'HITL',
    description: 'Human-in-the-loop approval gates for agent tasks. Native DZHC integration.',
    configFields: [
      { key: 'url', label: 'API URL', placeholder: 'https://app.paperclip.ing' },
      { key: 'apiKey', label: 'API Key', placeholder: 'pk_live_...', secret: true },
      { key: 'companyId', label: 'Company ID', placeholder: 'your-company-id' },
    ],
  },
  {
    name: 'Langfuse',
    toolName: 'langfuse',
    category: 'HOTL / Observability',
    description: 'Open-source LLM engineering platform — tracing, evals, and dashboards.',
    configFields: [
      { key: 'host', label: 'Host', placeholder: 'https://cloud.langfuse.com' },
      { key: 'publicKey', label: 'Public Key', placeholder: 'pk-lf-...' },
      { key: 'secretKey', label: 'Secret Key', placeholder: 'sk-lf-...', secret: true },
    ],
  },
  {
    name: 'Guardrails AI',
    toolName: 'guardrails_ai',
    category: 'Guardrail',
    description: 'Input/output validation and content filtering for LLM pipelines.',
    configFields: [
      { key: 'url', label: 'API URL', placeholder: 'http://localhost:8000' },
      { key: 'apiKey', label: 'API Key', placeholder: 'grapi_...', secret: true },
    ],
  },
  {
    name: 'Lakera Guard',
    toolName: 'lakera',
    category: 'Guardrail',
    description: 'Prompt injection and jailbreak protection.',
    configFields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'lkr_...', secret: true },
    ],
  },
  {
    name: 'NeMo Guardrails',
    toolName: 'nemo',
    category: 'Guardrail',
    description: 'Colang-based guardrails for LLM applications (self-hosted webhook).',
    configFields: [
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://your-nemo-server/guardrails' },
    ],
  },
  {
    name: 'LangSmith',
    toolName: 'langsmith',
    category: 'HITL',
    description: 'Tracing, testing, and human feedback collection for LLM apps.',
    configFields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'lsv2_pt_...', secret: true },
      { key: 'project', label: 'Project', placeholder: 'my-project' },
    ],
  },
  {
    name: 'AgentOps',
    toolName: 'agentops',
    category: 'HOTL / Observability',
    description: 'Agent monitoring, session replay, and analytics.',
    configFields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'ao-...', secret: true },
    ],
  },
  {
    name: 'Kill Switch',
    toolName: 'killswitch',
    category: 'Emergency Break',
    description: 'Custom webhook-based emergency stop for any agent or process.',
    configFields: [
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://your-server/kill-switch' },
      { key: 'secret', label: 'HMAC Secret', placeholder: 'webhook signing secret', secret: true },
    ],
  },
];

const CATEGORY_STYLES: Record<string, { badge: string; border: string }> = {
  'Guardrail': { badge: 'text-emerald-400 bg-emerald-900/30', border: 'border-emerald-800/30' },
  'HITL': { badge: 'text-cyan-400 bg-cyan-900/30', border: 'border-cyan-800/30' },
  'HOTL / Observability': { badge: 'text-indigo-400 bg-indigo-900/30', border: 'border-indigo-800/30' },
  'Emergency Break': { badge: 'text-red-400 bg-red-900/30', border: 'border-red-800/30' },
};

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001';
const TENANT_ID = import.meta.env['VITE_DEMO_TENANT_ID'] ?? 'demo';
const api = axios.create({ baseURL: API_BASE, headers: { 'x-tenant-id': TENANT_ID } });

// ---------------------------------------------------------------------------
// Connect modal
// ---------------------------------------------------------------------------

function ConnectModal({
  tool,
  onClose,
  onConnect,
}: {
  tool: ToolDef;
  onClose: () => void;
  onConnect: (config: Record<string, string>) => void;
}) {
  const [fields, setFields] = useState<Record<string, string>>(
    Object.fromEntries(tool.configFields.map((f) => [f.key, ''])),
  );
  const [testing, setTesting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    onConnect(fields);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[#1a1a2e] border border-white/10 p-6 shadow-2xl">
        <h2 className="text-base font-semibold text-white mb-1">Connect {tool.name}</h2>
        <p className="text-xs text-gray-500 mb-5">{tool.description}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {tool.configFields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs text-gray-400 mb-1">{field.label}</label>
              <input
                type={field.secret ? 'password' : 'text'}
                placeholder={field.placeholder}
                value={fields[field.key] ?? ''}
                onChange={(e) => setFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          ))}

          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={testing}
              className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {testing ? 'Connecting…' : 'Connect & Test'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Integration card
// ---------------------------------------------------------------------------

function IntegrationCard({
  tool,
  integration,
  onConnect,
  onDisconnect,
  onTest,
}: {
  tool: ToolDef;
  integration: Integration | undefined;
  onConnect: () => void;
  onDisconnect: () => void;
  onTest: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const styles = CATEGORY_STYLES[tool.category] ?? CATEGORY_STYLES['Guardrail'];
  const isConnected = integration?.status === 'connected';
  const isError = integration?.status === 'error';

  return (
    <div className={clsx('rounded-xl bg-white/[0.03] border p-4 flex flex-col gap-3 transition-colors', styles.border)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={clsx(
            'flex h-8 w-8 items-center justify-center rounded-lg',
            isConnected ? 'bg-emerald-400/10' : isError ? 'bg-red-400/10' : 'bg-white/5',
          )}>
            {isConnected ? (
              <Wifi className="h-4 w-4 text-emerald-400" />
            ) : isError ? (
              <WifiOff className="h-4 w-4 text-red-400" />
            ) : (
              <Plug className="h-4 w-4 text-gray-500" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{tool.name}</h3>
            {integration?.lastSyncedAt && (
              <p className="text-[10px] text-gray-600 flex items-center gap-1 mt-0.5">
                <Clock className="h-2.5 w-2.5" />
                {formatDate(integration.lastSyncedAt)}
              </p>
            )}
          </div>
        </div>
        <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide', styles.badge)}>
          {tool.category}
        </span>
      </div>

      <p className="text-xs text-gray-500 flex-1">{tool.description}</p>

      {/* Status */}
      {integration && (
        <div className={clsx(
          'flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg',
          isConnected ? 'bg-emerald-400/5 text-emerald-400' :
          isError ? 'bg-red-400/5 text-red-400' :
          'bg-white/5 text-gray-500',
        )}>
          {isConnected ? <CheckCircle2 className="h-3.5 w-3.5" /> :
           isError ? <XCircle className="h-3.5 w-3.5" /> :
           <AlertTriangle className="h-3.5 w-3.5" />}
          {isConnected ? 'Connected' : isError ? 'Connection error' : 'Disconnected'}
        </div>
      )}

      {/* Webhook URL (for webhook-based tools) */}
      {isConnected && tool.configFields.some((f) => f.key === 'webhookUrl') && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Code className="h-3 w-3" />
            Webhook endpoint
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {expanded && (
            <code className="mt-1.5 block text-[10px] text-cyan-300 font-mono bg-white/5 px-2 py-1.5 rounded break-all">
              POST {API_BASE}/api/integrations/webhooks/{tool.toolName}
            </code>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-1">
        {integration ? (
          <>
            <button
              onClick={onTest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Test
            </button>
            <button
              onClick={onDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-400/10 text-xs text-gray-300 hover:text-red-400 transition-colors"
            >
              <WifiOff className="h-3 w-3" />
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-xs text-black font-semibold transition-colors"
          >
            <Plug className="h-3 w-3" />
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function IntegrationsPage() {
  const [connectingTool, setConnectingTool] = useState<ToolDef | null>(null);
  const queryClient = useQueryClient();

  const { data: integrations = [] } = useQuery<Integration[]>({
    queryKey: ['integrations'],
    queryFn: () => api.get('/api/integrations').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: { toolName: string; config: Record<string, string> }) =>
      api.post('/api/integrations', body),
    onSuccess: async (res) => {
      // Immediately test the connection
      await api.post(`/api/integrations/${res.data.id}/test`);
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setConnectingTool(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/integrations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/integrations/${id}/test`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  });

  const connectedCount = integrations.filter((i) => i.status === 'connected').length;

  const byCategory = TOOL_CATALOG.reduce<Record<string, ToolDef[]>>((acc, tool) => {
    (acc[tool.category] ??= []).push(tool);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Integration Hub</h1>
        <p className="mt-1 text-sm text-gray-400">
          Connect governance tools to enable monitoring and control.
          {connectedCount > 0 && (
            <span className="ml-2 text-emerald-400 font-medium">{connectedCount} connected</span>
          )}
        </p>
      </div>

      {/* Category sections */}
      {Object.entries(byCategory).map(([category, tools]) => (
        <div key={category} className="mb-8">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{category}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => {
              const integration = integrations.find((i) => i.toolName === tool.toolName);
              return (
                <IntegrationCard
                  key={tool.toolName}
                  tool={tool}
                  integration={integration}
                  onConnect={() => setConnectingTool(tool)}
                  onDisconnect={() => integration && deleteMutation.mutate(integration.id)}
                  onTest={() => integration && testMutation.mutate(integration.id)}
                />
              );
            })}
          </div>
        </div>
      ))}

      {/* Connect modal */}
      {connectingTool && (
        <ConnectModal
          tool={connectingTool}
          onClose={() => setConnectingTool(null)}
          onConnect={(config) =>
            createMutation.mutate({ toolName: connectingTool.toolName, config })
          }
        />
      )}
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
