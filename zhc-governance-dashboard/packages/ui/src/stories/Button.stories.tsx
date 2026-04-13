import type { Meta, StoryObj } from '@storybook/react';
import { Shield, ArrowRight, Loader } from 'lucide-react';
import { Button } from '../components/Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger', 'outline'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { children: 'Connect Integration', variant: 'primary' },
};

export const Secondary: Story = {
  args: { children: 'View Details', variant: 'secondary' },
};

export const Ghost: Story = {
  args: { children: 'Cancel', variant: 'ghost' },
};

export const Danger: Story = {
  args: { children: 'Trigger Kill-switch', variant: 'danger' },
};

export const Outline: Story = {
  args: { children: 'Export Report', variant: 'outline' },
};

export const WithLeftIcon: Story = {
  args: {
    children: 'Governance Check',
    variant: 'primary',
    leftIcon: <Shield size={14} />,
  },
};

export const WithRightIcon: Story = {
  args: {
    children: 'View Agent',
    variant: 'outline',
    rightIcon: <ArrowRight size={14} />,
  },
};

export const Loading: Story = {
  args: { children: 'Connecting…', variant: 'primary', loading: true },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="outline">Outline</Button>
    </div>
  ),
};
