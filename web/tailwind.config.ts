import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'media',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './context/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          light: 'var(--primary-light)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          light: 'var(--accent-light)',
        },
        background: 'var(--bg)',
        'background-warm': 'var(--bg-warm)',
        card: {
          DEFAULT: 'var(--card)',
          elevated: 'var(--card-elevated)',
        },
        text: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
          tertiary: 'var(--text-tertiary)',
        },
        border: 'var(--border)',
        separator: 'var(--separator)',
        success: {
          DEFAULT: 'var(--success)',
          light: 'var(--success-light)',
        },
        destructive: 'var(--destructive)',
      },
      fontFamily: {
        sans: [
          'var(--font-dm-sans)',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        display: [
          'var(--font-display)',
          'var(--font-dm-sans)',
          'system-ui',
          'sans-serif',
        ],
      },
      fontSize: {
        'display-lg': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-md': ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-sm': ['1.375rem', { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '600' }],
      },
      boxShadow: {
        card: 'var(--shadow)',
        'card-hover': 'var(--shadow-lg)',
        glow: 'var(--shadow-glow)',
        'glow-accent': '0 0 20px rgba(245, 158, 11, 0.15)',
        elev1: 'var(--shadow)',
        elev2: 'var(--shadow-lg)',
      },
      borderRadius: {
        card: 'var(--radius)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius)',
        lg: 'var(--radius-lg)',
        ios: 'var(--radius-ios-group)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'var(--gradient-mesh)',
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-accent': 'var(--gradient-accent)',
        'gradient-hero': 'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out both',
        'fade-in-up': 'fadeInUp 0.6s ease-out both',
        shimmer: 'shimmer 2s linear infinite',
        marquee: 'marquee 25s linear infinite',
      },
      animationDelay: {
        '100': '100ms',
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
