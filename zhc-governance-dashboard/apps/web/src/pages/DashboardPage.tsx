import { ShieldCheck, Bot, GitBranch, Plug, AlertTriangle } from 'lucide-react';

const stats = [
  { label: 'Agents', value: '—', icon: Bot, color: 'text-cyan-400' },
  { label: 'Processes', value: '—', icon: GitBranch, color: 'text-indigo-400' },
  { label: 'Integrations', value: '—', icon: Plug, color: 'text-emerald-400' },
  { label: 'Open Alerts', value: '—', icon: AlertTriangle, color: 'text-amber-400' },
];

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Governance Overview</h1>
        <p className="mt-1 text-sm text-gray-400">
          Monitor AI agent governance controls across your organisation.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`rounded-xl bg-surface-3 p-3 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Governance coverage */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-5 w-5 text-cyan-400" />
          <h2 className="font-semibold text-white">Governance Coverage</h2>
        </div>
        <p className="text-sm text-gray-400">
          Connect agents and governance tools to see coverage metrics here.
        </p>
      </div>

      {/* Recent events */}
      <div className="card">
        <h2 className="font-semibold text-white mb-4">Recent Control Events</h2>
        <div className="flex items-center justify-center h-24 text-gray-600 text-sm">
          No events yet — integrate governance tools to start tracking.
        </div>
      </div>
    </div>
  );
}
