import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Bot, GitBranch, Plug, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/agents', label: 'Agents', icon: Bot },
  { to: '/processes', label: 'Processes', icon: GitBranch },
  { to: '/integrations', label: 'Integrations', icon: Plug },
];

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-surface-3 bg-surface-1">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-3">
          <ShieldCheck className="h-7 w-7 text-cyan-400" />
          <span className="text-sm font-bold text-white tracking-wide">ZHC Governance</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400'
                        : 'text-gray-400 hover:bg-surface-3 hover:text-white',
                    )
                  }
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-surface-3">
          <p className="text-xs text-gray-600">v0.1.0-alpha</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
