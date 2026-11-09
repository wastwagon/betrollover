import { Phase3HubPageContent, phase3GenerateMetadata } from '@/lib/seo/phase3-page';

export const generateMetadata = phase3GenerateMetadata('ghana-premier-league-predictions');

export default async function GhanaPremierLeaguePredictionsPage() {
  return <Phase3HubPageContent hubKey="ghana-premier-league-predictions" />;
}
