import React from 'react';
import { cn } from '../utils';

export type BadgeVariant =
  | 'default'
  | 'cyan'
  | 'orange'
  | 'indigo'
  | 'success'
  | 'warning'
  | 'danger'
  | 'outline';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-bg-surface2)] text-[var(--color-text-muted)] border border-[var(--color-border)]',
  cyan: 'bg-[var(--color-accent-cyan-dim)] text-[var(--color-accent-cyan)] border border-[rgba(34,211,238,0.2)]',
  orange: 'bg-[var(--color-accent-orange-dim)] text-[var(--color-accent-orange)] border border-[rgba(249,115,22,0.2)]',
  indigo: 'bg-[var(--color-accent-indigo-dim)] text-[var(--color-accent-indigo-light)] border border-[rgba(99,102,241,0.2)]',
  success: 'bg-[var(--color-success-dim)] text-[var(--color-success)] border border-[rgba(16,185,129,0.2)]',
  warning: 'bg-[var(--color-warning-dim)] text-[var(--color-warning)] border border-[rgba(245,158,11,0.2)]',
  danger: 'bg-[var(--color-danger-dim)] text-[var(--color-danger)] border border-[rgba(239,68,68,0.2)]',
  outline: 'bg-transparent text-[var(--color-text-muted)] border border-[var(--color-border)]',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-[6px] py-[2px] text-[0.65rem] font-[var(--font-medium)]',
  md: 'px-[var(--space-2)] py-[3px] text-[var(--text-xs)] font-[var(--font-medium)]',
};

const dotVariantColors: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-text-muted)]',
  cyan: 'bg-[var(--color-accent-cyan)]',
  orange: 'bg-[var(--color-accent-orange)]',
  indigo: 'bg-[var(--color-accent-indigo)]',
  success: 'bg-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger)]',
  outline: 'bg-[var(--color-text-muted)]',
};

export function Badge({ variant = 'default', size = 'md', dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[var(--space-1)] rounded-[var(--radius-full)] font-[var(--font-family-sans)] tracking-wide uppercase',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('inline-block h-[6px] w-[6px] rounded-full shrink-0', dotVariantColors[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
