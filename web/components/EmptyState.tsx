'use client';

import Image from 'next/image';
import Link from 'next/link';
import { IconPicks } from '@/components/ios/icons';
import { Button, buttonClassName } from '@/components/ui/Button';

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onActionClick,
  icon,
  imageSrc,
  imageAlt = '',
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
  onActionClick?: () => void;
  /** Omit for default SVG; pass a string only for legacy emoji (discouraged). */
  icon?: string;
  /** Optional marketing / empty-state illustration (served from `/public`). */
  imageSrc?: string;
  imageAlt?: string;
}) {
  const ctaClass = buttonClassName({ className: 'w-full max-w-xs sm:w-auto sm:max-w-none shrink-0' });
  const hasAction = actionLabel && (onActionClick || actionHref);
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-14 px-4 text-center w-full min-w-0 max-w-full">
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={imageAlt}
          width={280}
          height={176}
          className="mb-5 max-w-full h-auto rounded-2xl object-contain bg-[var(--fill-secondary)]"
        />
      ) : icon ? (
        <span
          className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--fill-secondary)] text-2xl"
          aria-hidden
        >
          {icon}
        </span>
      ) : (
        <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--fill-secondary)] text-[var(--text-muted)]">
          <IconPicks className="h-7 w-7 opacity-70" aria-hidden />
        </span>
      )}
      <h3 className="text-[17px] font-semibold tracking-tight text-[var(--text)] mb-2 min-w-0 max-w-full break-words px-1">
        {title}
      </h3>
      <p className="text-[15px] text-[var(--text-muted)] max-w-full sm:max-w-md mb-7 leading-relaxed min-w-0 break-words px-1">
        {description}
      </p>
      {hasAction && onActionClick ? (
        <Button type="button" onClick={onActionClick} className="w-full max-w-xs sm:w-auto sm:max-w-none shrink-0">
          {actionLabel}
        </Button>
      ) : hasAction && actionHref ? (
        <Link href={actionHref} className={ctaClass}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
