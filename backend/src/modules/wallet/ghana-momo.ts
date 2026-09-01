/** Paystack Ghana MoMo telco codes from GET /bank?currency=GHS&type=mobile_money */
export const PAYSTACK_MOMO_BANK_CODES = ['MTN', 'VOD', 'ATL'] as const;
export type PaystackMomoBankCode = (typeof PAYSTACK_MOMO_BANK_CODES)[number];

const PROVIDER_TO_BANK_CODE: Record<string, PaystackMomoBankCode> = {
  mtn: 'MTN',
  mtn_gh: 'MTN',
  mtn_mobile_money: 'MTN',
  vod: 'VOD',
  vodafone: 'VOD',
  vodafone_gh: 'VOD',
  vod_mobile_money: 'VOD',
  telecel: 'VOD',
  telecel_gh: 'VOD',
  atl: 'ATL',
  airteltigo: 'ATL',
  airteltigo_gh: 'ATL',
  airtel_tigo: 'ATL',
  tigo: 'ATL',
  atl_mobile_money: 'ATL',
};

export function toPaystackMomoBankCode(input: string | undefined | null): PaystackMomoBankCode | null {
  if (!input?.trim()) return null;
  const normalized = input.trim().toUpperCase();
  if ((PAYSTACK_MOMO_BANK_CODES as readonly string[]).includes(normalized)) {
    return normalized as PaystackMomoBankCode;
  }
  const key = input.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return PROVIDER_TO_BANK_CODE[key] ?? null;
}

/** Local Ghana MSISDN: 0XXXXXXXXX (10 digits). Accepts 233… and 9-digit forms. */
export function normalizeGhanaMomoPhone(input: string | undefined | null): string | null {
  if (!input) return null;
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('233') && digits.length === 12) {
    digits = `0${digits.slice(3)}`;
  }
  if (digits.length === 9 && /^[235]/.test(digits)) {
    digits = `0${digits}`;
  }
  if (digits.length === 10 && digits.startsWith('0')) return digits;
  return null;
}

export function isPaystackRecipientCode(code: string | null | undefined): boolean {
  return !!code && /^RCP_/i.test(code);
}

export function isPaystackTransfersUnavailableMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('starter business') ||
    m.includes('third party payout') ||
    m.includes('transfer has not been enabled') ||
    m.includes('transfers are not available') ||
    m.includes('paystack is not configured')
  );
}
