import { Phase3HubPageContent, phase3GenerateMetadata } from '@/lib/seo/phase3-page';

export const generateMetadata = phase3GenerateMetadata('football-predictions-today');

export default async function FootballPredictionsTodayPage() {
  return <Phase3HubPageContent hubKey="football-predictions-today" />;
}
