'use client';

import { useId, type CSSProperties } from 'react';

/**
 * Home hero background — CSS gradients + compact inline SVG only (~2–3 KB equivalent).
 * Replaces heavy raster hero art for faster LCP and no extra image requests.
 */
export function HomeHeroBackdrop() {
  const gid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const sweep = `${gid}-sweep`;
  const arc = `${gid}-arc`;
  const ball = `${gid}-ball`;
  const vignette = `${gid}-vignette`;

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {/* Base + mesh (no blur — cheap to paint) */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 70% at 50% -25%, rgba(52, 211, 153, 0.28), transparent 52%),
            radial-gradient(ellipse 55% 45% at 95% 25%, rgba(16, 185, 129, 0.14), transparent 50%),
            radial-gradient(ellipse 50% 40% at 5% 70%, rgba(6, 95, 70, 0.35), transparent 48%),
            linear-gradient(168deg, #020617 0%, #042f2e 28%, #064e3b 52%, #0f172a 100%)
          `,
        }}
      />
      {/* Soft side glows — single blur layer on md+ only (saves mobile GPU) */}
      <div className="hidden md:block absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full bg-emerald-400/20 blur-[100px]" />
      <div className="hidden md:block absolute bottom-0 -left-16 h-[320px] w-[320px] rounded-full bg-teal-600/15 blur-[90px]" />

      {/* Vector layer: stadium read, pitch geometry, subtle motion lines */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.85] md:opacity-100"
        viewBox="0 0 1600 560"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={sweep} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0" />
            <stop offset="45%" stopColor="#6ee7b7" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={arc} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ecfdf5" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#ecfdf5" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={ball} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d1fae5" stopOpacity="0.15" />
            <stop offset="70%" stopColor="#34d399" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={vignette} cx="50%" cy="40%" r="75%">
            <stop offset="40%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.55" />
          </radialGradient>
        </defs>
        {/* Diagonal energy streak */}
        <path
          d="M200 620 L980 -40 L1040 -40 L280 620 Z"
          fill={`url(#${sweep})`}
        />
        <path
          d="M420 620 L1180 -20 L1240 -20 L500 620 Z"
          fill={`url(#${sweep})`}
          opacity="0.5"
        />
        {/* Ground plane curve */}
        <path
          d="M0 380 Q400 340 800 360 T1600 400 L1600 560 L0 560 Z"
          fill={`url(#${arc})`}
        />
        {/* Stadium silhouette (left) */}
        <g fill="#020617" opacity="0.55">
          <path d="M0 200 L0 560 L380 560 L380 320 Q280 280 180 260 Q90 245 0 240 Z" />
          <rect x="40" y="160" width="8" height="100" rx="2" opacity="0.9" />
          <rect x="72" y="148" width="8" height="112" rx="2" opacity="0.85" />
          <rect x="104" y="138" width="8" height="122" rx="2" opacity="0.8" />
          <rect x="136" y="152" width="8" height="108" rx="2" opacity="0.75" />
        </g>
        {/* Floodlight pools */}
        <ellipse cx="120" cy="120" rx="140" ry="70" fill="#34d399" opacity="0.06" />
        <ellipse cx="280" cy="90" rx="100" ry="48" fill="#6ee7b7" opacity="0.05" />
        {/* Abstract ball + bokeh (right) */}
        <circle cx="1280" cy="200" r="120" fill={`url(#${ball})`} />
        <circle cx="1380" cy="260" r="28" fill="#ecfdf5" opacity="0.08" />
        <circle cx="1420" cy="180" r="16" fill="#a7f3d0" opacity="0.1" />
        <circle cx="1340" cy="320" r="12" fill="#6ee7b7" opacity="0.07" />
        {/* Pitch markings — very subtle */}
        <g stroke="#ecfdf5" strokeOpacity="0.06" strokeWidth="1.2" fill="none">
          <path d="M 680 400 A 120 120 0 0 0 920 400" />
          <line x1="800" y1="400" x2="800" y2="560" strokeDasharray="6 10" />
        </g>
        {/* Bottom vignette for text contrast */}
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
