import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { StatusIndicator } from '../components/StatusIndicator';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card style={{ maxWidth: 400 }}>
      <CardHeader>
        <CardTitle>Agent Overview</CardTitle>
        <Badge variant="success" dot>Active</Badge>
      </CardHeader>
      <CardBody>
        <p>This agent is currently operating under full governance coverage with all four control layers active.</p>
      </CardBody>
      <CardFooter>
        <Button size="sm" variant="outline">View Details</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithAccent: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 400 }}>
      <Card accent="cyan"><CardTitle>Cyan Accent</CardTitle></Card>
      <Card accent="orange"><CardTitle>Orange Accent</CardTitle></Card>
      <Card accent="indigo"><CardTitle>Indigo Accent</CardTitle></Card>
      <Card accent="success"><CardTitle>Success Accent</CardTitle></Card>
      <Card accent="warning"><CardTitle>Warning Accent</CardTitle></Card>
      <Card accent="danger"><CardTitle>Danger Accent</CardTitle></Card>
    </div>
  ),
};

export const Interactive: Story = {
  render: () => (
    <Card interactive accent="cyan" style={{ maxWidth: 360 }}>
      <CardHeader>
        <CardTitle>Marcom Creative</CardTitle>
        <StatusIndicator status="healthy" label="Healthy" />
      </CardHeader>
      <CardBody>
        <p style={{ fontSize: '0.875rem' }}>Role: Visual content & social media</p>
      </CardBody>
    </Card>
  ),
};

export const GovernanceCard: Story = {
  render: () => (
    <Card accent="cyan" style={{ maxWidth: 460 }}>
      <CardHeader>
        <div>
          <CardTitle>Founding Engineer</CardTitle>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
            did:key:z6Mkf9…3d2e
          </p>
        </div>
        <Badge variant="success" dot>Compliant</Badge>
      </CardHeader>
      <CardBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <StatusIndicator status="healthy" label="Guardrails" size="sm" />
          <StatusIndicator status="healthy" label="HITL" size="sm" />
          <StatusIndicator status="degraded" label="HOTL" size="sm" />
          <StatusIndicator status="healthy" label="Emergency Break" size="sm" />
        </div>
      </CardBody>
    </Card>
  ),
};
