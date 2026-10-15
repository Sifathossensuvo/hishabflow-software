/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Hind Siliguri"', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Bricolage Grotesque"', '"Hind Siliguri"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: { DEFAULT: '#17212B', soft: '#46525E', mute: '#7A8591' },
        line: '#E3E8E5',
        mist: '#F4F6F5',
        brand: { 50: '#E8F5EE', 100: '#CBEADA', 200: '#9FD6BB', 500: '#12946A', 600: '#0B7A57', 700: '#08613F', 800: '#064B33' },
        due: { 50: '#FCEDEB', 100: '#F8D5D0', 600: '#BF3A2B', 700: '#9C2D20' },
        gold: { 50: '#FBF3E2', 600: '#9A6A0B' },
      },
      boxShadow: {
        pop: '0 12px 32px -8px rgba(23,33,43,.22)',
      },
      screens: { xs: '420px' },
    },
  },
  plugins: [],
};
