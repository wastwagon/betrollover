import { FIXTURE_LIVE_CHIP } from '@/lib/live-fixture-display';

export function FixtureLiveChip({
  label,
  className = '',
}: {
  label: string;
  className?: string;
}) {
  if (!label) return null;
  return (
    <span className={`${FIXTURE_LIVE_CHIP} ${className}`}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--destructive)]" aria-hidden />
      {label}
    </span>
  );
}
