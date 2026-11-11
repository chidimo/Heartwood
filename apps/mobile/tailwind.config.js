/** @type {import('tailwindcss').Config} */
// Placeholder brand palette (deep green, like the heartwood of a tree). Replace once there is a design.
module.exports = {
  darkMode: 'media',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef5f0',
          100: '#d6e8db',
          200: '#aed1b9',
          400: '#5a9a6e',
          500: '#3a7d50',
          600: '#2c6340',
          700: '#224f33',
          800: '#1a3d28',
          900: '#112a1b',
          DEFAULT: '#2c6340',
        },
        ink: '#14211a',
        danger: '#b8433a',
        success: '#2f8f5b',
      },
    },
  },
  plugins: [],
};
