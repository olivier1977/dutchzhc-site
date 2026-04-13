import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Shield,
  Activity,
  Key,
  Plug,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import type { SidebarSection } from '../components/Sidebar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';

const meta: Meta<typeof Sidebar> = {
  title: 'Components/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;

const sections: SidebarSection[] = [
  {
    id: 'main',
    title: 'Governance',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} />, href: '#', active: true },
      { id: 'agents', label: 'Agents', icon: <Users size={16} />, href: '#' },
      { id: 'controls', label: 'Controls', icon: <Shield size={16} />, href: '#', badge: <Badge variant="warning" size="sm">2</Badge> },
      { id: 'events', label: 'Events', icon: <Activity size={16} />, href: '#' },
    ],
  },
  {
    id: 'identity',
    title: 'Identity',
    items: [
      { id: 'dids', label: 'DIDs & VCs', icon: <Key size={16} />, href: '#' },
      { id: 'integrations', label: 'Integrations', icon: <Plug size={16} />, href: '#', badge: <Badge variant="cyan" size="sm">3</Badge> },
    ],
  },
  {
    id: 'system',
    title: 'System',
    items: [
      { id: 'alerts', label: 'Alerts', icon: <Bell size={16} />, href: '#', badge: <Badge variant="danger" size="sm">1</Badge> },
      { id: 'settings', label: 'Settings', icon: <Settings size={16} />, href: '#' },
    ],
  },
];

export const Default: StoryObj = {
  render: () => (
    <div style={{ height: '100vh', display: 'flex' }}>
      <Sidebar
        sections={sections}
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--color-accent-orange-dim)', border: '1px solid var(--color-accent-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={14} color="var(--color-accent-orange)" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text)', letterSpacing: '0.04em' }}>
              ZHC Dashboard
            </span>
          </div>
        }
        footer={
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
            v0.1.0-alpha
          </div>
        }
      />
      <div style={{ flex: 1, padding: '2rem', background: 'var(--color-bg-primary)' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Main content area</p>
      </div>
    </div>
  ),
};

export const Collapsible: StoryObj = {
  render: () => {
    const [collapsed, setCollapsed] = useState(false);
    return (
      <div style={{ height: '100vh', display: 'flex' }}>
        <Sidebar
          sections={sections}
          collapsed={collapsed}
          footer={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              leftIcon={collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              fullWidth
            >
              {!collapsed && 'Collapse'}
            </Button>
          }
        />
        <div style={{ flex: 1, padding: '2rem', background: 'var(--color-bg-primary)' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>Click the button to toggle the sidebar.</p>
        </div>
      </div>
    );
  },
};
