import type { ReactNode } from 'react';

/** Compact outline icons (SF Symbols–style) for navigation and lists. */

const stroke = 1.75;

function IconBase({ children, className = 'w-5 h-5' }: { children: ReactNode; className?: string }) {
  return (
    <svg className={`shrink-0 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={stroke} aria-hidden>
      {children}
    </svg>
  );
}

export function IconSearch(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2M11 18a7 7 0 100-14 7 7 0 000 14z" />
    </IconBase>
  );
}

export function IconTrophy(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM5 4H3v2a2 2 0 002 2M19 4h2v2a2 2 0 01-2 2" />
    </IconBase>
  );
}

export function IconChart(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5M10 19V9M16 19v-6M22 19V3" />
    </IconBase>
  );
}

export function IconTrending(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-10" />
    </IconBase>
  );
}

export function IconRocket(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7z" />
    </IconBase>
  );
}

export function IconTarget(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
    </IconBase>
  );
}

export function IconPackage(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5" />
    </IconBase>
  );
}

export function IconCart(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h15l-1.5 9H8L6 6zM6 6L5 3H2M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
    </IconBase>
  );
}

export function IconDiamond(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 7-7 11L5 10l7-7z" />
    </IconBase>
  );
}

export function IconLive(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 16.5c4-4.5 11-4.5 15 0M7 13.5c2.5-2.5 7.5-2.5 10 0M9.5 10.5a3 3 0 014 0" />
    </IconBase>
  );
}

export function IconArchive(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16v12H4V7zM8 7V5h8v2M12 11v4" />
    </IconBase>
  );
}

export function IconTable(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16M8 6v12M16 6v12" />
    </IconBase>
  );
}

export function IconUsers(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H2v-2a4 4 0 015-3.87M12 12a4 4 0 100-8 4 4 0 000 8zm8 2a3 3 0 10-6 0M6 14a3 3 0 10-6 0" />
    </IconBase>
  );
}

export function IconBook(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h9a3 3 0 013 3v13H8a3 3 0 01-3-3V4zM5 20h11" />
    </IconBase>
  );
}

export function IconDashboard(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 13h6V4H4v9zm10 7h6V11h-6v9zM4 20h6v-5H4v5zm10-9h6V4h-6v7z" />
    </IconBase>
  );
}

export function IconPerson(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 100-8 4 4 0 000 8zM6 20v-1a6 6 0 0112 0v1" />
    </IconBase>
  );
}

export function IconWallet(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h15a3 3 0 013 3v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm16 5h2a1 1 0 100-2h-2v2z" />
    </IconBase>
  );
}

export function IconEarnings(props: { className?: string }) {
  return <IconChart className={props.className} />;
}

export function IconPicks(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </IconBase>
  );
}

export function IconBag(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h15l-1.5 9H8L6 6zM6 6L5 3H2" />
    </IconBase>
  );
}

export function IconBell(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17H9l-1 2h8l-1-2zM12 3a5 5 0 00-5 5v4l-2 3h14l-2-3V8a5 5 0 00-5-5z" />
    </IconBase>
  );
}

export function IconStar(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2.4 6.8H22l-5.6 4.1 2.1 6.9L12 16.8 5.5 20.8l2.1-6.9L2 9.8h7.6L12 3z" />
    </IconBase>
  );
}

export function IconLogout(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3m0 0l4-4m-4 4l4 4M9 4h8a2 2 0 012 2v12a2 2 0 01-2 2H9" />
    </IconBase>
  );
}

export function IconChevronLeft(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
    </IconBase>
  );
}

export function IconChevronRight(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
    </IconBase>
  );
}

export function IconShield(props: { className?: string }) {
  return (
    <IconBase className={props.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
    </IconBase>
  );
}
