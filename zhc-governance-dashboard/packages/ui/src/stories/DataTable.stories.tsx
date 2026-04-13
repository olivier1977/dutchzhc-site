import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { DataTable } from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { Badge } from '../components/Badge';
import { StatusIndicator } from '../components/StatusIndicator';
import type { StatusLevel } from '../components/StatusIndicator';

const meta: Meta = {
  title: 'Components/DataTable',
  tags: ['autodocs'],
};

export default meta;

interface AgentRow {
  id: string;
  name: string;
  role: string;
  status: StatusLevel;
  compliance: 'Compliant' | 'Partial' | 'Non-Compliant';
  lastActive: string;
}

const agentData: AgentRow[] = [
  { id: '1', name: 'Founding Engineer', role: 'CTO', status: 'healthy', compliance: 'Compliant', lastActive: '2 min ago' },
  { id: '2', name: 'Marcom Creative', role: 'Marketing', status: 'healthy', compliance: 'Compliant', lastActive: '5 min ago' },
  { id: '3', name: 'CISO', role: 'Security', status: 'degraded', compliance: 'Partial', lastActive: '12 min ago' },
  { id: '4', name: 'CEO (Episkope Duo)', role: 'CEO', status: 'healthy', compliance: 'Compliant', lastActive: 'Just now' },
];

const complianceVariant = (c: AgentRow['compliance']) =>
  c === 'Compliant' ? 'success' : c === 'Partial' ? 'warning' : 'danger';

const columns: Column<AgentRow>[] = [
  {
    key: 'name',
    header: 'Agent',
    accessor: (row) => (
      <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>{row.name}</span>
    ),
  },
  {
    key: 'role',
    header: 'Role',
    accessor: (row) => (
      <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{row.role}</span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    accessor: (row) => <StatusIndicator status={row.status} label={row.status} size="sm" />,
  },
  {
    key: 'compliance',
    header: 'Compliance',
    accessor: (row) => <Badge variant={complianceVariant(row.compliance)} dot>{row.compliance}</Badge>,
  },
  {
    key: 'lastActive',
    header: 'Last Active',
    align: 'right',
    accessor: (row) => (
      <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
        {row.lastActive}
      </span>
    ),
  },
];

export const AgentRegistry: StoryObj = {
  render: () => (
    <DataTable
      columns={columns}
      data={agentData}
      caption="Agent governance registry"
    />
  ),
};

export const Empty: StoryObj = {
  render: () => (
    <DataTable
      columns={columns}
      data={[]}
      emptyState="No agents registered yet."
    />
  ),
};

export const Clickable: StoryObj = {
  render: () => (
    <DataTable
      columns={columns}
      data={agentData}
      onRowClick={(row) => alert(`Selected: ${row.name}`)}
    />
  ),
};
