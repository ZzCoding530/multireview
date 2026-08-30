/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#dbe3ff',
          500: '#3b5bdb',
          600: '#2f4bbd',
          700: '#24389b',
        },
        sidebar: '#0f172a',
      },
    },
  },
  plugins: [],
};
