import { ContentPage } from '@/components/ContentPage';

export const metadata = {
  title: 'About | BetRollover',
  description: 'Learn about BetRollover - verified football tips with escrow protection.',
};

export default function AboutPage() {
  return <ContentPage slug="about" fallbackTitle="About BetRollover" />;
}
