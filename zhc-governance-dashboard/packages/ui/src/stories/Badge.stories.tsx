import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../components/Badge';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
      <Badge variant="default">Default</Badge>
      <Badge variant="cyan">Cyan</Badge>
      <Badge variant="orange">Orange</Badge>
      <Badge variant="indigo">Indigo</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

export const WithDot: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
      <Badge variant="success" dot>Active</Badge>
      <Badge variant="warning" dot>Degraded</Badge>
      <Badge variant="danger" dot>Critical</Badge>
      <Badge variant="cyan" dot>Connected</Badge>
      <Badge variant="default" dot>Unknown</Badge>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <Badge variant="cyan" size="sm">Small</Badge>
      <Badge variant="cyan" size="md">Medium</Badge>
    </div>
  ),
};

export const GovernanceLabels: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      <Badge variant="success" dot>Compliant</Badge>
      <Badge variant="warning" dot>Partial Coverage</Badge>
      <Badge variant="danger" dot>Non-Compliant</Badge>
      <Badge variant="indigo">HITL Required</Badge>
      <Badge variant="cyan">ZHC Certified</Badge>
      <Badge variant="orange">Board Review</Badge>
    </div>
  ),
};
