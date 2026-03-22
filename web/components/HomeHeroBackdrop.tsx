'use client';

import { useId, type CSSProperties } from 'react';

/**
 * Home hero — CSS mesh + rich inline SVG (multi-sport motifs). No raster; negligible transfer size.
 */
export function HomeHeroBackdrop() {
  const gid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const sweep = `${gid}-sweep`;
  const arc = `${gid}-arc`;
  const ballGlow = `${gid}-ballGlow`;
  const vignette = `${gid}-vignette`;
  const soccerClip = `${gid}-soccerClip`;

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 72% at 50% -22%, rgba(52, 211, 153, 0.26), transparent 54%),
            radial-gradient(ellipse 50% 42% at 92% 22%, rgba(16, 185, 129, 0.12), transparent 50%),
            radial-gradient(ellipse 48% 38% at 8% 68%, rgba(6, 95, 70, 0.38), transparent 46%),
            linear-gradient(168deg, #020617 0%, #042f2e 26%, #065f46 50%, #0f172a 100%)
          `,
        }}
      />
      <div className="hidden md:block absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full bg-emerald-400/18 blur-[100px]" />
      <div className="hidden md:block absolute bottom-0 -left-16 h-[320px] w-[320px] rounded-full bg-teal-600/14 blur-[90px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-[0.88] sm:opacity-95 md:opacity-100"
        viewBox="0 0 1600 560"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={sweep} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0" />
            <stop offset="42%" stopColor="#6ee7b7" stopOpacity="0.11" />
            <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={arc} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ecfdf5" stopOpacity="0.065" />
            <stop offset="100%" stopColor="#ecfdf5" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={ballGlow} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d1fae5" stopOpacity="0.12" />
            <stop offset="72%" stopColor="#34d399" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={vignette} cx="50%" cy="38%" r="78%">
            <stop offset="35%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.62" />
          </radialGradient>
          <clipPath id={soccerClip}>
            <circle cx="0" cy="0" r="86" />
          </clipPath>
        </defs>

        <path d="M200 620 L980 -40 L1040 -40 L280 620 Z" fill={`url(#${sweep})`} />
        <path d="M420 620 L1180 -20 L1240 -20 L500 620 Z" fill={`url(#${sweep})`} opacity="0.45" />

        <path
          d="M0 380 Q400 340 800 360 T1600 400 L1600 560 L0 560 Z"
          fill={`url(#${arc})`}
        />

        <g fill="#020617" opacity="0.52">
          <path d="M0 200 L0 560 L380 560 L380 320 Q280 280 180 260 Q90 245 0 240 Z" />
          <rect x="40" y="160" width="8" height="100" rx="2" opacity="0.9" />
          <rect x="72" y="148" width="8" height="112" rx="2" opacity="0.85" />
          <rect x="104" y="138" width="8" height="122" rx="2" opacity="0.8" />
          <rect x="136" y="152" width="8" height="108" rx="2" opacity="0.75" />
        </g>

        <ellipse cx="118" cy="118" rx="130" ry="64" fill="#34d399" opacity="0.055" />
        <ellipse cx="268" cy="88" rx="92" ry="44" fill="#6ee7b7" opacity="0.045" />

        {/* ─── Multi-sport motifs (edges + corners — center stays clear for copy) ─── */}
        <g opacity="0.92">
          {/* Basketball — upper left */}
          <g transform="translate(318, 138)">
            <circle r="56" fill="rgba(251,146,60,0.16)" stroke="rgba(251,191,36,0.22)" strokeWidth="1.2" />
            <g fill="none" stroke="rgba(15,23,42,0.58)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="0" y1="-56" x2="0" y2="56" />
              <path d="M 0,-56 Q -52,0 0,56" />
              <path d="M 0,-56 Q 52,0 0,56" />
            </g>
          </g>

          {/* Tennis — lime sphere + seams */}
          <g transform="translate(520, 108)">
            <circle r="42" fill="rgba(217,249,157,0.14)" stroke="rgba(190,242,100,0.28)" strokeWidth="1" />
            <g fill="none" stroke="rgba(248,250,252,0.32)" strokeWidth="2.2" strokeLinecap="round">
              <path d="M -36,-6 Q 0 4 36,-6" />
              <path d="M -36,6 Q 0 -4 36,6" />
            </g>
          </g>

          {/* American football + laces — lower left */}
          <g transform="translate(168, 412) rotate(-18)">
            <ellipse rx="54" ry="34" fill="rgba(154,52,18,0.22)" stroke="rgba(253,230,138,0.28)" strokeWidth="1" />
            <g stroke="rgba(254,243,199,0.45)" strokeWidth="1.6" strokeLinecap="round">
              <line x1="-6" y1="-14" x2="-6" y2="14" />
              <line x1="0" y1="-14" x2="0" y2="14" />
              <line x1="6" y1="-14" x2="6" y2="14" />
            </g>
            <line x1="-10" y1="0" x2="10" y2="0" stroke="rgba(254,243,199,0.35)" strokeWidth="1.2" />
          </g>

          {/* Soccer — classic panel read (clipped) */}
          <g transform="translate(1245, 172)">
            <circle r="86" fill="rgba(248,250,252,0.11)" stroke="rgba(226,232,240,0.22)" strokeWidth="1.2" />
            <g clipPath={`url(#${soccerClip})`}>
              <g
                fill="rgba(15,23,42,0.42)"
                stroke="rgba(15,23,42,0.55)"
                strokeWidth="1.1"
                strokeLinejoin="round"
              >
                <path d="M 0,-30 L 28.5,-9 L 17.6,24.3 L -17.6,24.3 L -28.5,-9 Z" />
                <path d="M 0,-86 L 14,-52 L -14,-52 Z" opacity="0.9" />
                <path d="M 60,-28 L 32,-8 L 48,22 Z" opacity="0.85" />
                <path d="M -60,-28 L -32,-8 L -48,22 Z" opacity="0.85" />
                <path d="M 40,58 L 8,38 L -8,38 L -40,58 Z" opacity="0.8" />
                <path d="M 72,18 L 48,42 L 22,28 Z" opacity="0.75" />
                <path d="M -72,18 L -48,42 L -22,28 Z" opacity="0.75" />
              </g>
            </g>
          </g>

          {/* Volleyball — panel seams */}
          <g transform="translate(1490, 298)">
            <circle r="44" fill="rgba(248,250,252,0.07)" stroke="rgba(203,213,225,0.28)" strokeWidth="1" />
            <g fill="none" stroke="rgba(148,163,184,0.42)" strokeWidth="1.35" strokeLinecap="round">
              <path d="M 0,-44 Q 44,0 0,44" />
              <path d="M 0,-44 Q -44,0 0,44" />
              <path d="M -44,0 Q 0,44 44,0" />
            </g>
          </g>

          {/* Hockey puck */}
          <g transform="translate(1095, 468)">
            <ellipse rx="36" ry="11" fill="rgba(30,41,59,0.55)" stroke="rgba(100,116,139,0.4)" strokeWidth="1" />
            <ellipse rx="36" ry="4" cy="-3" fill="rgba(51,65,85,0.35)" />
          </g>

          {/* Baseball — stitches */}
          <g transform="translate(1545, 128)">
            <circle r="26" fill="rgba(248,250,252,0.09)" stroke="rgba(226,232,240,0.2)" strokeWidth="1" />
            <g fill="none" stroke="rgba(248,113,113,0.45)" strokeWidth="1.2" strokeLinecap="round">
              <path d="M -14,-8 Q 0,0 14,-8" strokeDasharray="2 3" />
              <path d="M -14,8 Q 0,0 14,8" strokeDasharray="2 3" />
            </g>
          </g>

          {/* Subtle basketball hoop ring — far right, very soft */}
          <g transform="translate(1388, 92)" opacity="0.35">
            <ellipse rx="34" ry="10" fill="none" stroke="rgba(251,191,36,0.35)" strokeWidth="2" />
            <path d="M -34,6 L -28,38 L 28,38 L 34,6" fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="1.2" />
          </g>
        </g>

        {/* Soft glow behind soccer */}
        <circle cx="1245" cy="172" r="108" fill={`url(#${ballGlow})`} />

        <g stroke="#ecfdf5" strokeOpacity="0.055" strokeWidth="1.2" fill="none">
          <path d="M 680 400 A 120 120 0 0 0 920 400" />
          <line x1="800" y1="400" x2="800" y2="560" strokeDasharray="6 10" />
        </g>

        <rect
          width="1600"
          height="560"
          fill={`url(#${vignette})`}
          style={{ mixBlendMode: 'multiply' } as CSSProperties}
        />
      </svg>
    </div>
  );
}
