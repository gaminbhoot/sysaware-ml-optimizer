/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-family-sans)', 'sans-serif'],
        serif: ['var(--font-family-serif)', 'serif'],
        mono: ['var(--font-family-mono)', 'monospace'],
        nistha: ['var(--font-family-display)', 'serif'],
      },
      colors: {
        background: 'var(--color-bg-base)',
        surface: 'var(--color-bg-surface)',
        border: 'var(--color-border-subtle)',
        'border-strong': 'var(--color-border-strong)',
        silver: 'var(--color-text-secondary)',
        emerald: 'var(--color-accent-emerald)',
        muted: 'var(--color-text-muted)',
      },
      spacing: {
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '6': 'var(--space-6)',
        '8': 'var(--space-8)',
        '12': 'var(--space-12)',
      },
      backgroundImage: {
        'radial-fade': 'radial-gradient(circle at center, rgba(30, 30, 40, 0.5) 0%, var(--color-bg-base) 70%)',
      }
    },
  },
  plugins: [],
}