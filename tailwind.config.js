/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Geist Sans"', '"Geist"', '"Inter"', 'sans-serif'],
        heading: ['"Geist Sans"', '"Geist"', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace']
      },
    },
  },
  plugins: [],
};

