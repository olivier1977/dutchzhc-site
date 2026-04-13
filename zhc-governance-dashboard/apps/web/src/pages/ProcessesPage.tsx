import { GitBranch, Plus } from 'lucide-react';

export default function ProcessesPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Processes</h1>
          <p className="mt-1 text-sm text-gray-400">
            View and manage end-to-end multi-agent processes.
          </p>
        </div>
        <button className="btn-primary">
          <Plus className="h-4 w-4" />
          New Process
        </button>
      </div>

      <div className="card flex flex-col items-center justify-center h-48 gap-3">
        <GitBranch className="h-10 w-10 text-gray-600" />
        <p className="text-sm text-gray-400">No processes defined yet.</p>
        <button className="btn-primary text-xs">Define a process</button>
      </div>
    </div>
  );
}
