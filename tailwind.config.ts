import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Deep green — trust, growth, the Roti Ghar identity
        brand: {
          50: '#f0f7f2',
          100: '#daeade',
          200: '#b7d5c1',
          300: '#8bb89b',
          400: '#5d9673',
          500: '#3d7a57',
          600: '#2c6144',
          700: '#244e38',
          800: '#1e3f2e',
          900: '#193427',
          950: '#0d1d16',
        },
        // Warm off-white / cream surfaces
        cream: {
          50: '#fdfcf8',
          100: '#faf7f0',
          200: '#f4efe3',
          300: '#eae2d0',
          400: '#dccfb5',
          500: '#c9b795',
          600: '#b09b76',
        },
        // Warm neutral for cards, borders and muted text
        clay: {
          50: '#f8f6f3',
          100: '#efeae4',
          200: '#ded5ca',
          300: '#c6b8a8',
          400: '#a89583',
          500: '#8f7a68',
          600: '#75634f',
          700: '#5e5041',
          800: '#4c4137',
          900: '#403830',
        },
        saffron: {
          50: '#fdf8ed',
          100: '#f8eccd',
          200: '#f0d697',
          300: '#e7bb5f',
          400: '#dd9c33',
          500: '#c9821e',
          600: '#a86318',
          700: '#874a18',
          800: '#6f3c19',
          900: '#5e3318',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia', 'serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(30, 63, 46, 0.04), 0 8px 24px -12px rgba(30, 63, 46, 0.16)',
        lift: '0 2px 4px rgba(30, 63, 46, 0.05), 0 16px 40px -16px rgba(30, 63, 46, 0.22)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.24s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
