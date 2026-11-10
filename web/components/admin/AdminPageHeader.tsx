'use client';

import { PageHeader } from '@/components/PageHeader';
import type { ReactNode } from 'react';

/** Shared admin title block — matches user dashboard PageHeader language. */
export function AdminPageHeader({
  label = 'Admin',
  title,
  tagline,
  action,
}: {
  label?: string;
  title: string;
  tagline?: ReactNode;
  action?: ReactNode;
}) {
  return <PageHeader label={label} title={title} tagline={tagline} action={action} />;
}

export function AdminStatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--separator)] bg-[var(--card)] p-4 sm:p-5 min-w-0">
      <p className="text-[12px] font-medium text-[var(--text-muted)] mb-1">{label}</p>
      <p className="text-[22px] sm:text-[26px] font-semibold tracking-tight tabular-nums text-[var(--text)]">
        {value}
      </p>
      {hint ? <p className="text-[11px] text-[var(--text-tertiary)] mt-1 leading-snug">{hint}</p> : null}
    </div>
  );
}

export function AdminSectionLabel({ children }: { children: string }) {
  return (
    <h2 className="text-[13px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.08em] mb-2 sm:mb-3 px-0.5">
      {children}
    </h2>
  );
}
