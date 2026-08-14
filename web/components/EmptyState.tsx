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
    <div className="flex flex-col items-center justify-center py-16 px-4 sm:px-8 text-center w-full min-w-0 max-w-full">
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={imageAlt}
          width={320}
          height={200}
          className="mb-6 max-w-full h-auto rounded-xl object-contain border border-[var(--border)] bg-[var(--card)]/50"
        />
      ) : icon ? (
        <span className="text-5xl mb-6" aria-hidden>{icon}</span>
      ) : (
        <IconPicks className="w-14 h-14 mb-6 text-[var(--text-muted)] opacity-50" aria-hidden />
      )}
      <h3 className="text-xl font-semibold text-[var(--text)] mb-3 min-w-0 max-w-full break-words px-1">{title}</h3>
      <p className="text-[var(--text-muted)] max-w-full sm:max-w-md mb-10 leading-relaxed min-w-0 break-words px-1">{description}</p>
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
