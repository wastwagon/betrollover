import { Phase3HubPageContent, phase3GenerateMetadata } from '@/lib/seo/phase3-page';

export const generateMetadata = phase3GenerateMetadata('over-2-5-goals-predictions');

export default async function Over25GoalsPredictionsPage() {
  return <Phase3HubPageContent hubKey="over-2-5-goals-predictions" />;
}
