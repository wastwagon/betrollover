'use client';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Optional count shown beside the label (e.g. day / price tallies). */
  count?: number;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = 'max-w-md',
  'aria-label': ariaLabel,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`ios-segmented w-full ${className}`}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          data-active={value === opt.value ? 'true' : 'false'}
          className="ios-segmented-btn flex-1 touch-target inline-flex items-center justify-center gap-1"
          onClick={() => onChange(opt.value)}
        >
          <span>{opt.label}</span>
          {opt.count != null ? (
            <span
              className="ios-segmented-count tabular-nums"
              aria-label={`${opt.count}`}
            >
              {opt.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
