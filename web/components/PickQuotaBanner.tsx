'use client';

import { useT } from '@/context/LanguageContext';
import { formatQuotaResetUtc, type DailyCouponQuota } from '@/lib/daily-coupon-quota';

export function PickQuotaBanner({
  dailyQuota,
  atDailyLimit,
  className = '',
}: {
  dailyQuota: DailyCouponQuota;
  atDailyLimit: boolean;
  className?: string;
}) {
  const t = useT();
  const resetTime = formatQuotaResetUtc(dailyQuota.resetsAtUtc) || dailyQuota.resetsAtUtc;

  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
        atDailyLimit
          ? 'border-[var(--destructive)]/30 bg-[var(--destructive-light)] text-[var(--destructive)]'
          : 'border-[var(--primary)]/25 bg-[var(--primary-light)] text-[var(--text)]'
      } ${className}`}
      role="status"
    >
      {dailyQuota.exempt ? (
        <p className="font-medium">{t('pick_quota.exempt')}</p>
      ) : dailyQuota.maxPerDay <= 0 ? (
        <p className="font-medium">{t('pick_quota.unlimited_platform')}</p>
      ) : atDailyLimit ? (
        <p className="font-medium">
          {t('pick_quota.at_limit', {
            max: String(dailyQuota.maxPerDay),
            resetTime,
          })}
        </p>
      ) : (
        <p className="font-medium">
          {t('pick_quota.remaining', {
            remaining: String(dailyQuota.remaining ?? 0),
            max: String(dailyQuota.maxPerDay),
            used: String(dailyQuota.usedToday),
            resetTime,
          })}
        </p>
      )}
    </div>
  );
}
