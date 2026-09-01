'use client';

export function CreatePickStepsNav() {
  return (
    <nav
      className="sticky z-20 mb-5 rounded-[var(--radius)] border border-[var(--separator)] bg-[var(--card)] p-1"
      style={{ top: 'var(--br-chrome-below-header)' }}
      aria-label="Create pick steps"
    >
      <ol className="grid grid-cols-3 gap-1">
        {[
          { href: '#create-pick-sport', label: '1 · Sport' },
          { href: '#create-pick-select', label: '2 · Select' },
          { href: '#create-pick-publish', label: '3 · Publish' },
        ].map((step) => (
          <li key={step.href}>
            <a
              href={step.href}
              className="flex items-center justify-center min-h-[40px] rounded-[var(--radius-sm)] text-[11px] sm:text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--fill-secondary)] hover:text-[var(--text)]"
            >
              {step.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
