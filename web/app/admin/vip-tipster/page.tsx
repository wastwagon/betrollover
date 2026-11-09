import { permanentRedirect } from 'next/navigation';

/** Legacy path — free desk lives at /admin/sure-two-fold (not VIP). */
export default function AdminVipTipsterRedirectPage() {
  permanentRedirect('/admin/sure-two-fold');
}
