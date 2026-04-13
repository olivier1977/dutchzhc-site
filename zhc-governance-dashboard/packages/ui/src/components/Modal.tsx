import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, description, children, footer, size = 'md', className }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-[var(--space-4)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--color-bg-primary)] opacity-80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'relative z-10 w-full rounded-[var(--radius-xl)] border border-[var(--color-border-strong)] bg-[var(--color-bg-surface2)] shadow-[var(--shadow-lg)]',
          sizeMap[size],
          className,
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between gap-[var(--space-4)] border-b border-[var(--color-border)] p-[var(--space-6)]">
            <div>
              {title && (
                <h2
                  id="modal-title"
                  className="font-[var(--font-bold)] text-[var(--text-xl)] text-[var(--color-text)]"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="mt-[var(--space-1)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-[var(--radius-md)] p-[var(--space-1)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-surface3)] hover:text-[var(--color-text)]"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {!title && !description && (
          <button
            onClick={onClose}
            className="absolute right-[var(--space-4)] top-[var(--space-4)] rounded-[var(--radius-md)] p-[var(--space-1)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-surface3)] hover:text-[var(--color-text)]"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        )}

        {/* Body */}
        <div className="p-[var(--space-6)]">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-[var(--space-3)] border-t border-[var(--color-border)] px-[var(--space-6)] py-[var(--space-4)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
