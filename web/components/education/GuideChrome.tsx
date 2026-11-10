import type { ReactNode } from 'react';

/** iOS Settings-style stacked education sections. */
export function GuideStack({ children }: { children: ReactNode }) {
  return <div className="space-y-3 sm:space-y-3.5">{children}</div>;
}

export function GuidePanel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[var(--separator)] bg-[var(--card)] px-4 py-4 sm:px-5 sm:py-5 text-[var(--text)] ${className}`}
    >
      {children}
    </section>
  );
}

export function GuideStep({
  index,
  title,
  children,
}: {
  index?: string;
  title: string;
  children?: ReactNode;
}) {
  const hasBody = children != null && children !== false && children !== true;
  return (
    <GuidePanel>
      <div className="flex items-start gap-3">
        {index ? (
          <span
            className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--fill-secondary)] text-[12px] font-semibold tabular-nums text-[var(--text-muted)]"
            aria-hidden
          >
            {index}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-semibold leading-snug tracking-tight text-[var(--text)]">{title}</h2>
          {hasBody ? (
            <div className="mt-2 text-[15px] leading-relaxed text-[var(--text-muted)] [&_a]:font-semibold [&_a]:text-[var(--primary)]">
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </GuidePanel>
  );
}

export function GuideCallout({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary-light)]/70 px-4 py-3.5 sm:px-5 text-[13px] leading-relaxed text-[var(--text)] [&_a]:font-semibold [&_a]:text-[var(--primary)]">
      {children}
    </div>
  );
}

export function GuideFaqList({
  title,
  faqs,
}: {
  title: string;
  faqs: { question: string; answer: string }[];
}) {
  return (
    <section aria-label={title} className="mt-1">
      <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
        {title}
      </h2>
      <dl className="ios-grouped-section overflow-hidden divide-y divide-[var(--separator)]">
        {faqs.map((faq) => (
          <div key={faq.question} className="px-4 py-3.5 sm:px-5 sm:py-4 bg-[var(--card)]">
            <dt className="text-[15px] font-semibold text-[var(--text)]">{faq.question}</dt>
            <dd className="mt-1.5 text-[14px] leading-relaxed text-[var(--text-muted)]">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
