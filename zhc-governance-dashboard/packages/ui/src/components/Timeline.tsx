import React from 'react';
import { cn } from '../utils';
import type { StatusLevel } from './StatusIndicator';

export interface TimelineEvent {
  id: string;
  timestamp: string | Date;
  title: string;
  description?: string;
  status?: StatusLevel;
  agent?: string;
  category?: 'guardrail' | 'hitl' | 'hotl' | 'emergency' | 'identity' | 'system';
}

export interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const categoryColors: Record<NonNullable<TimelineEvent['category']>, string> = {
  guardrail: 'border-[var(--color-accent-indigo)] bg-[var(--color-accent-indigo-dim)]',
  hitl: 'border-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan-dim)]',
  hotl: 'border-[var(--color-accent-orange)] bg-[var(--color-accent-orange-dim)]',
  emergency: 'border-[var(--color-danger)] bg-[var(--color-danger-dim)]',
  identity: 'border-[var(--color-success)] bg-[var(--color-success-dim)]',
  system: 'border-[var(--color-border)] bg-[var(--color-bg-surface2)]',
};

const statusDotColors: Record<StatusLevel, string> = {
  healthy: 'bg-[var(--color-success)]',
  degraded: 'bg-[var(--color-warning)]',
  critical: 'bg-[var(--color-danger)]',
  unknown: 'bg-[var(--color-text-muted)]',
  inactive: 'bg-[var(--color-text-faint)]',
};

function formatTimestamp(ts: string | Date): string {
  const d = typeof ts === 'string' ? new Date(ts) : ts;
  return d.toLocaleString('en-NL', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Timeline({ events, className }: TimelineProps) {
  return (
    <ol className={cn('relative space-y-0', className)} aria-label="Event timeline">
      {events.map((event, idx) => (
        <li key={event.id} className="relative flex gap-[var(--space-4)]">
          {/* Vertical line */}
          {idx < events.length - 1 && (
            <span
              className="absolute left-[9px] top-[20px] bottom-0 w-[1px] bg-[var(--color-border)]"
              aria-hidden="true"
            />
          )}

          {/* Dot */}
          <span className="relative mt-[var(--space-1)] shrink-0 flex h-5 w-5 items-center justify-center">
            <span
              className={cn(
                'h-[10px] w-[10px] rounded-full border-[2px] border-[var(--color-bg-surface)]',
                event.status ? statusDotColors[event.status] : 'bg-[var(--color-accent-cyan)]',
              )}
            />
          </span>

          {/* Content */}
          <div className="pb-[var(--space-5)] min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-[var(--space-2)]">
              <span className="font-[var(--font-medium)] text-[var(--text-sm)] text-[var(--color-text)]">
                {event.title}
              </span>
              <time
                className="shrink-0 text-[var(--text-xs)] text-[var(--color-text-muted)] font-[var(--font-mono)]"
                dateTime={typeof event.timestamp === 'string' ? event.timestamp : event.timestamp.toISOString()}
              >
                {formatTimestamp(event.timestamp)}
              </time>
            </div>

            {event.description && (
              <p className="mt-[var(--space-1)] text-[var(--text-sm)] text-[var(--color-text-muted)] leading-relaxed">
                {event.description}
              </p>
            )}

            <div className="mt-[var(--space-2)] flex flex-wrap gap-[var(--space-2)]">
              {event.agent && (
                <span className="text-[var(--text-xs)] text-[var(--color-accent-cyan)] font-[var(--font-mono)]">
                  @{event.agent}
                </span>
              )}
              {event.category && (
                <span
                  className={cn(
                    'inline-flex items-center rounded-[var(--radius-sm)] border px-[var(--space-2)] py-[1px] text-[0.65rem] font-[var(--font-medium)] uppercase tracking-wide',
                    categoryColors[event.category],
                  )}
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {event.category}
                </span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
