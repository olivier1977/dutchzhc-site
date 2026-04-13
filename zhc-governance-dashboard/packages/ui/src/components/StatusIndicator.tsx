import React from 'react';
import { cn } from '../utils';

export type StatusLevel = 'healthy' | 'degraded' | 'critical' | 'unknown' | 'inactive';

export interface StatusIndicatorProps {
  status: StatusLevel;
  label?: string;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig: Record<
  StatusLevel,
  { color: string; bg: string; dimBg: string; label: string }
> = {
  healthy: {
    color: 'var(--color-success)',
    bg: 'bg-[var(--color-success)]',
    dimBg: 'bg-[var(--color-success-dim)]',
    label: 'Healthy',
  },
  degraded: {
    color: 'var(--color-warning)',
    bg: 'bg-[var(--color-warning)]',
    dimBg: 'bg-[var(--color-warning-dim)]',
    label: 'Degraded',
  },
  critical: {
    color: 'var(--color-danger)',
    bg: 'bg-[var(--color-danger)]',
    dimBg: 'bg-[var(--color-danger-dim)]',
    label: 'Critical',
  },
  unknown: {
    color: 'var(--color-text-muted)',
    bg: 'bg-[var(--color-text-muted)]',
    dimBg: 'bg-[var(--color-bg-surface2)]',
    label: 'Unknown',
  },
  inactive: {
    color: 'var(--color-text-faint)',
    bg: 'bg-[var(--color-text-faint)]',
    dimBg: 'bg-[var(--color-bg-surface2)]',
    label: 'Inactive',
  },
};

const sizeMap = {
  sm: { dot: 'h-2 w-2', text: 'text-[var(--text-xs)]', gap: 'gap-[var(--space-1)]' },
  md: { dot: 'h-2.5 w-2.5', text: 'text-[var(--text-sm)]', gap: 'gap-[var(--space-2)]' },
  lg: { dot: 'h-3 w-3', text: 'text-[var(--text-base)]', gap: 'gap-[var(--space-2)]' },
};

export function StatusIndicator({ status, label, pulse = false, size = 'md', className }: StatusIndicatorProps) {
  const config = statusConfig[status];
  const sizes = sizeMap[size];

  return (
    <span className={cn('inline-flex items-center', sizes.gap, className)}>
      <span className="relative inline-flex">
        <span className={cn('rounded-full', config.bg, sizes.dot)} />
        {pulse && (status === 'healthy' || status === 'degraded' || status === 'critical') && (
          <span
            className={cn(
              'absolute inset-0 rounded-full animate-ping opacity-60',
              config.bg,
            )}
          />
        )}
      </span>
      {(label !== undefined) && (
        <span
          className={cn(sizes.text)}
          style={{ color: config.color }}
        >
          {label ?? config.label}
        </span>
      )}
    </span>
  );
}

/** Governance coverage band: green/amber/red triple indicator */
export interface GovernanceCoverageProps {
  guardrails: StatusLevel;
  hitl: StatusLevel;
  hotl: StatusLevel;
  emergency: StatusLevel;
  className?: string;
}

export function GovernanceCoverage({ guardrails, hitl, hotl, emergency, className }: GovernanceCoverageProps) {
  const items: { key: string; label: string; status: StatusLevel }[] = [
    { key: 'guardrails', label: 'Guardrails', status: guardrails },
    { key: 'hitl', label: 'HITL', status: hitl },
    { key: 'hotl', label: 'HOTL', status: hotl },
    { key: 'emergency', label: 'Emergency', status: emergency },
  ];

  return (
    <div className={cn('flex items-center gap-[var(--space-3)] flex-wrap', className)}>
      {items.map(({ key, label, status }) => (
        <StatusIndicator key={key} status={status} label={label} size="sm" />
      ))}
    </div>
  );
}
