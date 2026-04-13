import React from 'react';
import { cn } from '../utils';

export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
  active?: boolean;
  children?: SidebarItem[];
}

export interface SidebarSection {
  id: string;
  title?: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  sections: SidebarSection[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  collapsed?: boolean;
  className?: string;
}

function SidebarNavItem({
  item,
  collapsed,
  depth = 0,
}: {
  item: SidebarItem;
  collapsed?: boolean;
  depth?: number;
}) {
  const Tag = item.href ? 'a' : 'button';

  return (
    <>
      <Tag
        href={item.href}
        onClick={item.onClick}
        className={cn(
          'group flex w-full items-center gap-[var(--space-3)] rounded-[var(--radius-md)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--text-sm)] transition-colors duration-[var(--transition-fast)]',
          depth > 0 && 'pl-[var(--space-8)]',
          item.active
            ? 'bg-[var(--color-accent-cyan-dim)] text-[var(--color-accent-cyan)] font-[var(--font-medium)]'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-surface3)] hover:text-[var(--color-text)]',
        )}
        aria-current={item.active ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
      >
        {item.icon && (
          <span
            className={cn(
              'shrink-0 text-[var(--text-base)]',
              item.active ? 'text-[var(--color-accent-cyan)]' : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]',
            )}
          >
            {item.icon}
          </span>
        )}

        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && <span className="shrink-0">{item.badge}</span>}
          </>
        )}
      </Tag>

      {!collapsed && item.children?.map((child) => (
        <SidebarNavItem key={child.id} item={child} depth={depth + 1} />
      ))}
    </>
  );
}

export function Sidebar({ sections, header, footer, collapsed, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-surface)] transition-all duration-[var(--transition-slow)]',
        collapsed ? 'w-[60px]' : 'w-[240px]',
        className,
      )}
    >
      {/* Header slot */}
      {header && (
        <div className="shrink-0 border-b border-[var(--color-border)] p-[var(--space-4)]">
          {header}
        </div>
      )}

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto p-[var(--space-3)] space-y-[var(--space-4)]">
        {sections.map((section) => (
          <div key={section.id}>
            {!collapsed && section.title && (
              <p className="mb-[var(--space-1)] px-[var(--space-3)] text-[0.65rem] font-[var(--font-semibold)] uppercase tracking-widest text-[var(--color-text-faint)]">
                {section.title}
              </p>
            )}
            <ul className="space-y-[2px]" role="list">
              {section.items.map((item) => (
                <li key={item.id}>
                  <SidebarNavItem item={item} collapsed={collapsed} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer slot */}
      {footer && (
        <div className="shrink-0 border-t border-[var(--color-border)] p-[var(--space-3)]">
          {footer}
        </div>
      )}
    </aside>
  );
}
