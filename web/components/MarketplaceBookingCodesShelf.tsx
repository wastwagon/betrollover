'use client';

import Link from 'next/link';
import { useT } from '@/context/LanguageContext';
import { BookingCodeCopyBlock } from '@/components/BookingCodeCopyBlock';

export type BookingCodeShelfItem = {
  id: number;
  title: string;
  bookmakerKey: string;
  bookingCode: string;
  bookingCodeCopyCount?: number;
  tipsterName?: string | null;
};

type MarketplaceBookingCodesShelfProps = {
  items: BookingCodeShelfItem[];
  className?: string;
};

/**
 * Community shelf of revealed booking codes — copy without opening every card.
 */
export function MarketplaceBookingCodesShelf({ items, className = '' }: MarketplaceBookingCodesShelfProps) {
  const t = useT();
  if (!items.length) return null;

  return (
    <section className={`mb-6 min-w-0 ${className}`}>
      <div className="flex items-end justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[var(--text)] sm:text-lg tracking-tight">
            {t('marketplace.booking_codes_shelf_title')}
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{t('marketplace.booking_codes_shelf_sub')}</p>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide -mx-1 px-1 touch-pan-x">
        {items.map((item) => (
          <div
            key={item.id}
            className="shrink-0 w-[min(100%,18rem)] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3"
          >
            <Link
              href={`/coupons/${item.id}`}
              className="block text-sm font-semibold text-[var(--text)] truncate hover:text-[var(--primary)] mb-1"
              title={item.title}
            >
              {item.title}
            </Link>
            {item.tipsterName ? (
              <p className="text-[11px] text-[var(--text-muted)] truncate mb-2">{item.tipsterName}</p>
            ) : null}
            <BookingCodeCopyBlock
              couponId={item.id}
              bookmakerKey={item.bookmakerKey}
              bookingCode={item.bookingCode}
              initialCopyCount={item.bookingCodeCopyCount ?? 0}
              dense
            />
          </div>
        ))}
      </div>
    </section>
  );
}
