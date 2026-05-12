/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Quicksand"', 'sans-serif'],
        serif: ['"Merriweather"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        background: '#050505',
        surface: '#111111',
        border: 'rgba(255, 255, 255, 0.1)',
        silver: '#E0E0E0',
        emerald: '#10B981',
      },
      backgroundImage: {
        'radial-fade': 'radial-gradient(circle at center, rgba(30, 30, 40, 0.5) 0%, #050505 70%)',
      }
    },
  },
  plugins: [],
}