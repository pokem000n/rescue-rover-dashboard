/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rover: {
          dark: '#0a0d14',
          panel: '#0f1420',
          card: '#141b2d',
          border: '#1f2a44',
          accent: '#00d2ff',
          neon: '#00f59b',
          warning: '#f59e0b',
          alert: '#ef4444'
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      }
    },
  },
  plugins: [],
}
