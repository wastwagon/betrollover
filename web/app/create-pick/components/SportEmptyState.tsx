export function SportEmptyState({ label, hint }: { label: string; hint: string; emoji?: string }) {
  return (
    <div className="text-sm text-[var(--text-muted)] py-8 text-center px-4">
      <div
        className="mx-auto mb-3 h-10 w-10 rounded-full border border-[var(--separator)] bg-[var(--fill-secondary)] flex items-center justify-center"
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[var(--text-tertiary)]">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <p className="font-medium mb-1 text-[var(--text)]">{label}</p>
      <p className="text-xs leading-relaxed max-w-sm mx-auto">{hint}</p>
    </div>
  );
}
