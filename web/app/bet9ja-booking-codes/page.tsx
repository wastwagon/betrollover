import { Phase3HubPageContent, phase3GenerateMetadata } from '@/lib/seo/phase3-page';

export const generateMetadata = phase3GenerateMetadata('bet9ja-booking-codes');

export default async function Bet9jaBookingCodesPage() {
  return <Phase3HubPageContent hubKey="bet9ja-booking-codes" />;
}
