import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;

export const Default: StoryObj = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Modal</Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Agent Identity"
          description="Verifiable credential details for this agent."
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="primary">Verify</Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>DID</p>
              <code style={{ fontSize: 'var(--text-sm)', color: 'var(--color-accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                did:key:z6Mkf9dX1a2B3c4D5e6F7g8H9i0J…3d2e
              </code>
            </div>
            <div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>Credential Type</p>
              <Badge variant="cyan">AIAgentOperatorCredential v1.0</Badge>
            </div>
            <div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>Issuer</p>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>DZHC Governance Registry</span>
            </div>
          </div>
        </Modal>
      </>
    );
  },
};

export const DangerConfirm: StoryObj = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="danger" onClick={() => setOpen(true)}>Trigger Kill-switch</Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Confirm Emergency Stop"
          description="This will halt all running agent executions immediately. This action is logged."
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={() => setOpen(false)}>Confirm Stop</Button>
            </>
          }
        >
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            All in-progress heartbeat runs will be interrupted. Board members will be notified.
            Agents must be manually reactivated by the board after investigation.
          </p>
        </Modal>
      </>
    );
  },
};
