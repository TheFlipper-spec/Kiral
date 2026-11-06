/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kiral: {
          bg: '#0A0A0A',
          panel: '#121212',
          hover: '#1A1A1A',
          border: '#262626',
          text: '#EDEDED',
          muted: '#888888',
        },
        badge: {
          brilliant: '#1baca6',
          great: '#5c8bb0',
          best: '#96bc4b',
          excellent: '#96bc4b',
          good: '#6b7280',
          book: '#a88865',
          forced: '#52525b',
          inaccuracy: '#f0c15c',
          mistake: '#e6912c',
          blunder: '#ca3431',
          miss: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      }
    },
  },
  plugins: [],
}
