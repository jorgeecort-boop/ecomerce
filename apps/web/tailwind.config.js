/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', '../../packages/ui/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#004e7c',
          50: '#eef7fb',
          100: '#d8edf6',
          200: '#b6ddea',
          300: '#86c3db',
          400: '#527293',
          500: '#004e7c',
          600: '#004166',
          700: '#003352',
          800: '#00263d',
          900: '#00192a',
        },
        secondary: '#527293',
        accent: '#f58a6c',
        surface: '#edf8f8',
        overlay: '#000000',
        text: '#1a1a1a',
        muted: '#6b7280',
      },
      borderRadius: {
        card: '12px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 2px 16px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 6px 24px rgba(0, 78, 124, 0.15)',
        badge: '0 4px 20px rgba(245, 138, 108, 0.4)',
      },
      maxWidth: {
        site: '1280px',
      },
      backgroundImage: {
        'hero-fallback': 'linear-gradient(135deg, #2a4a6b 0%, #527293 50%, #7ba4c0 100%)',
      },
    },
  },
  plugins: [],
};
