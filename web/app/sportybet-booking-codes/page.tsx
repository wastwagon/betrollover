import { Phase3HubPageContent, phase3GenerateMetadata } from '@/lib/seo/phase3-page';

export const generateMetadata = phase3GenerateMetadata('sportybet-booking-codes');

export default async function SportybetBookingCodesPage() {
  return <Phase3HubPageContent hubKey="sportybet-booking-codes" />;
}
