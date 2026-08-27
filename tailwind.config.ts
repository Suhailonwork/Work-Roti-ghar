import type { Config } from 'tailwindcss';

/**
 * Roti Ghar theme.
 *
 * Every text colour below was checked against the surface it actually sits on,
 * and each one clears WCAG AA (4.5:1) on BOTH the card and the page — including
 * the muted greys, which is where the old palette fell down: `clay-500` came in
 * at 3.8:1 and `clay-400` at 2.8:1, so timestamps, hints and placeholders were
 * genuinely hard to read rather than merely quiet.
 *
 * The surfaces were the other half of the problem. Cards used to sit at 1.04:1
 * against the page — mathematically almost the same colour, which is why
 * everything read as one flat sheet of cream. Cards are now white and the page
 * is a warm stone, giving 1.22:1: clearly not white, while the card edges stay
 * visible without leaning on heavy borders.
 *
 * The surface steps move together. Deepening the page alone would have collapsed
 * `clay-100` (the hover fill) into it at 1.02:1 — invisible — so the hover and
 * secondary surfaces were re-stepped alongside it, and `clay-400`/`saffron-500`
 * were darkened to hold AA against the deeper background.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Deep green — trust, growth, the Roti Ghar identity.
        brand: {
          50: '#eff6f1',
          100: '#d8e9de',
          200: '#b3d3bf',
          300: '#86b79c',
          400: '#579679',
          500: '#367a57',
          600: '#2a6145',
          700: '#214e37',
          800: '#1b3f2d',
          900: '#163326',
          950: '#0c1d15',
        },
        // Surfaces. 50 is the raised surface (cards, inputs, popovers); 100 is
        // the page beneath them. Keeping 50 white is what lets a card read as
        // a card at all.
        cream: {
          50: '#ffffff',
          100: '#eee8dc',
          200: '#e4dccd',
          300: '#d8cebb',
          400: '#c4b49b',
          500: '#ab9a7e',
          600: '#907d64',
        },
        // Warm neutral ramp: 100–300 are surfaces and borders, 400–900 are text.
        // 400 is the lightest tone allowed to carry text, and it passes AA.
        clay: {
          50: '#f6f3ee',
          100: '#e4ded2',
          200: '#cec4b4',
          300: '#ada08d',
          400: '#6b5d50',
          500: '#5a4e43',
          600: '#4a4038',
          700: '#3d342e',
          800: '#312b25',
          900: '#26211d',
        },
        // Accent. 300/400 are decorative fills; 500 and darker are safe for
        // text and for white text sitting on top of them.
        saffron: {
          50: '#fdf7ea',
          100: '#f9ebc9',
          200: '#f1d492',
          300: '#e6b757',
          400: '#d4972b',
          500: '#8e5b16',
          600: '#7c5115',
          700: '#684415',
          800: '#573a16',
          900: '#493115',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia', 'serif'],
      },
      letterSpacing: {
        // Large type looks loose at default tracking; small caps-y labels look
        // cramped. These two are applied in globals.css rather than by hand.
        heading: '-0.014em',
        label: '0.02em',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        // Tinted with the darkest neutral rather than pure black, so shadows
        // stay warm and never turn the surface grey. Two layers each: a tight
        // contact shadow for the edge, a wide soft one for the lift.
        xs: '0 1px 2px -1px rgb(38 33 29 / 0.08)',
        card: '0 1px 2px -1px rgb(38 33 29 / 0.07), 0 3px 10px -3px rgb(38 33 29 / 0.07)',
        lift: '0 2px 4px -2px rgb(38 33 29 / 0.09), 0 14px 32px -10px rgb(38 33 29 / 0.16)',
        pop: '0 4px 8px -4px rgb(38 33 29 / 0.12), 0 24px 48px -16px rgb(38 33 29 / 0.22)',
        inset: 'inset 0 1px 2px 0 rgb(38 33 29 / 0.06)',
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
