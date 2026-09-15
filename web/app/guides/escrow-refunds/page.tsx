import { redirect } from 'next/navigation';
import { getLocale } from '@/lib/i18n';

/** Old URL kept as a permanent redirect so existing links and search results still resolve. */
export default async function EscrowRefundsRedirectPage() {
  const locale = await getLocale();
  redirect(locale === 'fr' ? '/fr/guides/purchase-protection' : '/guides/purchase-protection');
}
