import type { Metadata } from 'next';

/** Logged-in / account surfaces: keep out of search indexes even if linked. */
export const privateAreaMetadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};
