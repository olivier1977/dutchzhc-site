import React from 'react';
import { cn } from '../utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds a cyan glow accent on the left border */
  accent?: 'cyan' | 'orange' | 'indigo' | 'success' | 'warning' | 'danger';
  /** Elevated surface variant */
  elevated?: boolean;
  /** Clickable/interactive card */
  interactive?: boolean;
}

const accentStyles: Record<NonNullable<CardProps['accent']>, string> = {
  cyan: 'border-l-[3px] border-l-[var(--color-accent-cyan)]',
  orange: 'border-l-[3px] border-l-[var(--color-accent-orange)]',
  indigo: 'border-l-[3px] border-l-[var(--color-accent-indigo)]',
  success: 'border-l-[3px] border-l-[var(--color-success)]',
  warning: 'border-l-[3px] border-l-[var(--color-warning)]',
  danger: 'border-l-[3px] border-l-[var(--color-danger)]',
};

export function Card({ className, accent, elevated, interactive, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-6)]',
        elevated ? 'bg-[var(--color-bg-surface2)]' : 'bg-[var(--color-bg-surface)]',
        interactive && 'cursor-pointer transition-all duration-[var(--transition-base)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-surface3)]',
        accent && accentStyles[accent],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-[var(--space-4)] flex items-center justify-between', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('font-[var(--font-semibold)] text-[var(--text-lg)] text-[var(--color-text)]', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('text-[var(--color-text-muted)]', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mt-[var(--space-4)] flex items-center gap-[var(--space-3)] border-t border-[var(--color-border)] pt-[var(--space-4)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
