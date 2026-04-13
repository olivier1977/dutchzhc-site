import type { Meta, StoryObj } from '@storybook/react';
import { StatusIndicator, GovernanceCoverage } from '../components/StatusIndicator';

const meta: Meta<typeof StatusIndicator> = {
  title: 'Components/StatusIndicator',
  component: StatusIndicator,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['healthy', 'degraded', 'critical', 'unknown', 'inactive'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    pulse: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof StatusIndicator>;

export const AllStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <StatusIndicator status="healthy" label="Healthy" />
      <StatusIndicator status="degraded" label="Degraded" />
      <StatusIndicator status="critical" label="Critical" />
      <StatusIndicator status="unknown" label="Unknown" />
      <StatusIndicator status="inactive" label="Inactive" />
    </div>
  ),
};

export const WithPulse: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <StatusIndicator status="healthy" label="Live — Healthy" pulse />
      <StatusIndicator status="degraded" label="Live — Degraded" pulse />
      <StatusIndicator status="critical" label="Live — Critical" pulse />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <StatusIndicator status="healthy" label="Small" size="sm" />
      <StatusIndicator status="healthy" label="Medium" size="md" />
      <StatusIndicator status="healthy" label="Large" size="lg" />
    </div>
  ),
};

export const GovernanceCoverageStory: StoryObj<typeof GovernanceCoverage> = {
  name: 'GovernanceCoverage',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <GovernanceCoverage
        guardrails="healthy"
        hitl="healthy"
        hotl="healthy"
        emergency="healthy"
      />
      <GovernanceCoverage
        guardrails="healthy"
        hitl="degraded"
        hotl="healthy"
        emergency="unknown"
      />
      <GovernanceCoverage
        guardrails="critical"
        hitl="critical"
        hotl="degraded"
        emergency="inactive"
      />
    </div>
  ),
};
