/**
 * Inline SVG clip-art for home “How it works” cards — zero extra HTTP requests, ~few KB gzipped.
 * Decorative only; pair with visible headings for meaning.
 */
function SvgWrap({
  children,
  className = '',
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 72 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : 'presentation'}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/** Browse & compare — search + pick list */
export function ArtworkBuyerBrowse({ className }: { className?: string }) {
  return (
    <SvgWrap className={className}>
      <rect x="8" y="10" width="28" height="36" rx="3" stroke="currentColor" strokeWidth="2" className="opacity-90" />
      <path d="M14 20h16M14 26h12M14 32h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="opacity-70" />
      <circle cx="48" cy="22" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M55 29l10 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </SvgWrap>
  );
}

/** Purchase & secure — escrow lock */
export function ArtworkBuyerSecure({ className }: { className?: string }) {
  return (
    <SvgWrap className={className}>
      <path
        d="M20 24v-6a16 16 0 1132 0v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="opacity-85"
      />
      <rect x="14" y="24" width="44" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="36" cy="38" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M36 34v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </SvgWrap>
  );
}

/** Win or refund — check + return arrow */
export function ArtworkBuyerOutcome({ className }: { className?: string }) {
  return (
    <SvgWrap className={className}>
      <circle cx="28" cy="28" r="18" stroke="currentColor" strokeWidth="2" className="opacity-50" />
      <path d="M18 28l6 6 12-14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M52 18v12M46 24h12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="opacity-80"
      />
    </SvgWrap>
  );
}

/** One account — linked profiles */
export function ArtworkSellerAccount({ className }: { className?: string }) {
  return (
    <SvgWrap className={className}>
      <circle cx="22" cy="22" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M10 46c0-8 6-12 12-12s12 4 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-80" />
      <circle cx="50" cy="22" r="10" stroke="currentColor" strokeWidth="2" className="opacity-70" />
      <path d="M38 46c0-8 6-12 12-12s12 4 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-50" />
      <path d="M36 28h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-60" />
    </SvgWrap>
  );
}

/** ROI threshold — rising chart */
export function ArtworkSellerRoi({ className }: { className?: string }) {
  return (
    <SvgWrap className={className}>
      <path d="M10 44h52" stroke="currentColor" strokeWidth="1.5" className="opacity-40" />
      <path
        d="M14 38l14-10 10 6 18-20"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="56" cy="14" r="4" fill="currentColor" className="opacity-90" />
      <path d="M48 8l8 6-4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="opacity-60" />
    </SvgWrap>
  );
}

/** Payout — wallet */
export function ArtworkSellerPayout({ className }: { className?: string }) {
  return (
    <SvgWrap className={className}>
      <rect x="10" y="16" width="48" height="32" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M10 24h52" stroke="currentColor" strokeWidth="2" />
      <rect x="44" y="28" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="52" cy="34" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="24" cy="38" r="5" stroke="currentColor" strokeWidth="1.5" className="opacity-60" />
    </SvgWrap>
  );
}

/** News & guides — document stack */
export function ArtworkNewsGuides({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="10" y="8" width="26" height="34" rx="2" stroke="currentColor" strokeWidth="1.8" className="opacity-70" />
      <rect x="14" y="12" width="26" height="34" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20h16M20 26h14M20 32h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="opacity-75" />
    </svg>
  );
}

/** Explore — compass */
export function ArtworkExplore({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="2" />
      <path d="M24 10v4M24 34v4M10 24h4M34 24h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" className="opacity-50" />
      <path
        d="M24 16l4 14-14 4 4-14 14-4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        className="opacity-95"
      />
    </svg>
  );
}
