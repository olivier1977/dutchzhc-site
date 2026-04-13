import React from 'react';
import { cn } from '../utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-[var(--color-accent-cyan)] text-[var(--color-text-inverse)] font-[var(--font-semibold)]',
    'hover:bg-[var(--color-accent-cyan-light)] shadow-[var(--shadow-glow-cyan)]',
    'disabled:opacity-50 disabled:shadow-none',
  ].join(' '),
  secondary: [
    'bg-[var(--color-accent-orange-dim)] text-[var(--color-accent-orange)] border border-[rgba(249,115,22,0.2)] font-[var(--font-medium)]',
    'hover:bg-[rgba(249,115,22,0.2)] hover:border-[rgba(249,115,22,0.35)]',
    'disabled:opacity-50',
  ].join(' '),
  ghost: [
    'bg-transparent text-[var(--color-text-muted)] font-[var(--font-medium)]',
    'hover:bg-[var(--color-bg-surface3)] hover:text-[var(--color-text)]',
    'disabled:opacity-50',
  ].join(' '),
  danger: [
    'bg-[var(--color-danger-dim)] text-[var(--color-danger)] border border-[rgba(239,68,68,0.2)] font-[var(--font-medium)]',
    'hover:bg-[rgba(239,68,68,0.2)] hover:border-[rgba(239,68,68,0.35)]',
    'disabled:opacity-50',
  ].join(' '),
  outline: [
    'bg-transparent text-[var(--color-text)] border border-[var(--color-border)] font-[var(--font-medium)]',
    'hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-surface3)]',
    'disabled:opacity-50',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-[var(--space-3)] text-[var(--text-xs)] gap-[var(--space-1)] rounded-[var(--radius-md)]',
  md: 'h-9 px-[var(--space-4)] text-[var(--text-sm)] gap-[var(--space-2)] rounded-[var(--radius-md)]',
  lg: 'h-11 px-[var(--space-6)] text-[var(--text-base)] gap-[var(--space-2)] rounded-[var(--radius-lg)]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  leftIcon,
  rightIcon,
  fullWidth,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap transition-all duration-[var(--transition-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-cyan)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg-primary)]',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      ) : leftIcon ? (
        <span className="shrink-0" aria-hidden="true">{leftIcon}</span>
      ) : null}
      {children}
      {!loading && rightIcon && (
        <span className="shrink-0" aria-hidden="true">{rightIcon}</span>
      )}
    </button>
  );
}
