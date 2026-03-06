/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0A',
        card: '#1A1A1A',
        border: '#2D2D2D',
        primary: '#FF6B35',
      },
    },
  },
  plugins: [],
};
