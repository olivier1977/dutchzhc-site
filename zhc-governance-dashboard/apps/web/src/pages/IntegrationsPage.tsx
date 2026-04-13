import { Plug } from 'lucide-react';

const integrations = [
  { name: 'Guardrails AI', category: 'Guardrail', status: 'not_connected', description: 'Input/output validation and content filtering.' },
  { name: 'Lakera Guard', category: 'Guardrail', status: 'not_connected', description: 'Prompt injection and jailbreak protection.' },
  { name: 'NeMo Guardrails', category: 'Guardrail', status: 'not_connected', description: 'Colang-based guardrails for LLM apps.' },
  { name: 'Paperclip', category: 'HITL', status: 'not_connected', description: 'Human-in-the-loop approval gates for agent tasks.' },
  { name: 'LangSmith', category: 'HITL', status: 'not_connected', description: 'Tracing, testing, and feedback for LLM apps.' },
  { name: 'Langfuse', category: 'HOTL / Observability', status: 'not_connected', description: 'Open-source LLM engineering platform.' },
  { name: 'AgentOps', category: 'HOTL / Observability', status: 'not_connected', description: 'Agent monitoring, replay, and analytics.' },
  { name: 'Kill Switch', category: 'Emergency Break', status: 'not_connected', description: 'Custom webhook-based emergency stop.' },
];

const categoryColors: Record<string, string> = {
  'Guardrail': 'text-emerald-400 bg-emerald-900/30',
  'HITL': 'text-cyan-400 bg-cyan-900/30',
  'HOTL / Observability': 'text-indigo-400 bg-indigo-900/30',
  'Emergency Break': 'text-red-400 bg-red-900/30',
};

export default function IntegrationsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Integration Hub</h1>
        <p className="mt-1 text-sm text-gray-400">
          Connect governance tools to enable monitoring and control.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <div key={integration.name} className="card flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Plug className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <h3 className="font-semibold text-white text-sm">{integration.name}</h3>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[integration.category] ?? 'text-gray-400 bg-gray-800'}`}
              >
                {integration.category}
              </span>
            </div>
            <p className="text-xs text-gray-400 flex-1">{integration.description}</p>
            <button className="btn-secondary text-xs w-full justify-center">
              Connect
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
