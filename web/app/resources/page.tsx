import { redirect } from 'next/navigation';

export default function ResourcesPage() {
  redirect('/discover?tab=guides');
}
