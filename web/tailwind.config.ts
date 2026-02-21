import type { Config } from 'tailwindcss';

const config: Config = {
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
        // Add semantic colors mapping to CSS variables
        background: 'var(--bg)',
        'background-warm': 'var(--bg-warm)',
        card: 'var(--card)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        border: 'var(--border)',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: 'var(--shadow)',
        'card-hover': 'var(--shadow-lg)',
        glow: 'var(--shadow-glow)',
        'glow-accent': '0 0 20px rgba(245, 158, 11, 0.15)',
      },
      borderRadius: {
        card: 'var(--radius)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'var(--gradient-mesh)',
        'gradient-page': 'var(--gradient-bg)',
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-accent': 'var(--gradient-accent)',
        'gradient-hero': 'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out both',
        'fade-in-up': 'fadeInUp 0.6s ease-out both',
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'float-slower': 'float 10s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-glow': 'pulseGlow 3s infinite',
        'gradient-shift': 'gradientShift 12s ease-in-out infinite',
        'orb-drift': 'orbDrift 15s ease-in-out infinite',
        'marquee': 'marquee 25s linear infinite',
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
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.0)' },
          '50%': { boxShadow: '0 0 25px rgba(16, 185, 129, 0.2)' },
        },
        gradientShift: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        orbDrift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(10%, -8%) scale(1.05)' },
          '50%': { transform: 'translate(-5%, 5%) scale(0.95)' },
          '75%': { transform: 'translate(-8%, -3%) scale(1.02)' },
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
