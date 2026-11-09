import { Phase3HubPageContent, phase3GenerateMetadata } from '@/lib/seo/phase3-page';

export const generateMetadata = phase3GenerateMetadata('btts-predictions');

export default async function BttsPredictionsPage() {
  return <Phase3HubPageContent hubKey="btts-predictions" />;
}
