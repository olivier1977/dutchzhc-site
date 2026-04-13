import type { Meta, StoryObj } from '@storybook/react';
import { Timeline } from '../components/Timeline';
import type { TimelineEvent } from '../components/Timeline';
import { Card } from '../components/Card';

const meta: Meta<typeof Timeline> = {
  title: 'Components/Timeline',
  component: Timeline,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Timeline>;

const sampleEvents: TimelineEvent[] = [
  {
    id: '1',
    timestamp: new Date('2026-04-13T09:14:00'),
    title: 'Guardrail triggered — prompt injection blocked',
    description: 'Input matched policy rule "disallow-system-override". Request halted before execution.',
    status: 'warning',
    agent: 'founding-engineer',
    category: 'guardrail',
  },
  {
    id: '2',
    timestamp: new Date('2026-04-13T09:22:00'),
    title: 'HITL approval requested',
    description: 'Task DUTA-71 subtask creation requires board approval due to budget threshold.',
    status: 'degraded',
    agent: 'ceo',
    category: 'hitl',
  },
  {
    id: '3',
    timestamp: new Date('2026-04-13T10:05:00'),
    title: 'HITL approval granted',
    description: 'Board member approved subtask creation. Execution resumed.',
    status: 'healthy',
    agent: 'ceo',
    category: 'hitl',
  },
  {
    id: '4',
    timestamp: new Date('2026-04-13T11:30:00'),
    title: 'DID credential verified',
    description: 'Agent identity confirmed via did:key:z6Mkf9…3d2e. VC signature valid.',
    status: 'healthy',
    agent: 'marcom-creative',
    category: 'identity',
  },
  {
    id: '5',
    timestamp: new Date('2026-04-13T13:00:00'),
    title: 'Langfuse trace recorded',
    description: 'Full execution trace for heartbeat run logged to HOTL observability layer.',
    status: 'healthy',
    category: 'hotl',
  },
];

export const Default: Story = {
  render: () => (
    <Card style={{ maxWidth: 560 }}>
      <Timeline events={sampleEvents} />
    </Card>
  ),
};

export const CriticalEvent: Story = {
  render: () => (
    <Card style={{ maxWidth: 560 }}>
      <Timeline
        events={[
          {
            id: 'e1',
            timestamp: new Date('2026-04-13T08:00:00'),
            title: 'Kill-switch activated',
            description: 'Emergency break triggered by board. All agent execution halted immediately.',
            status: 'critical',
            category: 'emergency',
            agent: 'ciso',
          },
          {
            id: 'e2',
            timestamp: new Date('2026-04-13T08:12:00'),
            title: 'System entering safe mode',
            description: 'All in-progress runs paused. Board notified via governance channel.',
            status: 'critical',
            category: 'system',
          },
        ]}
      />
    </Card>
  ),
};
