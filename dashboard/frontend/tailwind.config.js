/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        urrt: {
          teal: '#00a8b5',
          cyan: '#00c2cb',
          glow: '#00e5ff',
          dark: '#06090e',
          panel: '#0a0f18',
          card: '#0f1624',
          cardInner: '#141d2f',
          border: '#162338',
          borderHover: '#00c2cb50'
        },
        rover: {
          dark: '#06090e',
          panel: '#0a0f18',
          card: '#0f1624',
          border: '#162338',
          accent: '#00c2cb',
          neon: '#10b981',
          warning: '#f59e0b',
          alert: '#ef4444'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        tech: ['Chakra Petch', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      }
    },
  },
  plugins: [],
}
