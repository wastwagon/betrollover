import type { Metadata } from 'next';
import AdminLayoutClient from './AdminLayoutClient';
import { privateAreaMetadata } from '@/lib/seo/private-metadata';

export const metadata: Metadata = privateAreaMetadata;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
