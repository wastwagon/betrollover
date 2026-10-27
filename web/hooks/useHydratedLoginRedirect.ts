'use client';

import { useEffect, useState } from 'react';
import { currentLoginRedirectPath, loginRedirectUrl } from '@/lib/login-redirect-path';

/**
 * Stable login href on SSR + first paint; upgrades to full current URL after mount.
 */
export function useHydratedLoginRedirect(returnPath = '/marketplace'): string {
  const [href, setHref] = useState(() => loginRedirectUrl(returnPath));

  useEffect(() => {
    setHref(currentLoginRedirectPath(returnPath));
  }, [returnPath]);

  return href;
}
