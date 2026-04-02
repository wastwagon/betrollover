import { getGtmContainerId } from '@/lib/site-config';

/** Place immediately after `<body>` (Google install guide). Server-only. */
export function GoogleTagManagerNoScript() {
  const id = getGtmContainerId();
  if (!id) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${id}`}
        height={0}
        width={0}
        style={{ display: 'none', visibility: 'hidden' }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
