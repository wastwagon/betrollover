export function SportEmptyState({ emoji, label, hint }: { emoji: string; label: string; hint: string }) {
  return (
    <div className="text-sm text-[var(--text-muted)] py-6 text-center">
      <div className="text-3xl mb-2">{emoji}</div>
      <p className="font-medium mb-1 text-[var(--text)]">{label}</p>
      <p className="text-xs">{hint}</p>
    </div>
  );
}
