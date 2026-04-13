import { Bot, Plus } from 'lucide-react';

export default function AgentsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Agents</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage governance controls per AI or human agent.
          </p>
        </div>
        <button className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Agent
        </button>
      </div>

      <div className="card flex flex-col items-center justify-center h-48 gap-3">
        <Bot className="h-10 w-10 text-gray-600" />
        <p className="text-sm text-gray-400">No agents added yet.</p>
        <button className="btn-primary text-xs">Add your first agent</button>
      </div>
    </div>
  );
}
