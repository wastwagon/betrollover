'use client';

/**
 * Skip link for keyboard and screen reader users.
 * Visible on focus, allows jumping past navigation to main content.
 */
export function SkipToMainContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:px-6 focus:py-3 focus:rounded-xl focus:bg-emerald-600 focus:text-white focus:font-semibold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:w-auto focus:h-auto focus:m-0 focus:overflow-visible focus:[clip:auto]"
    >
      Skip to main content
    </a>
  );
}
