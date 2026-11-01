/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        netra: {
          bg: '#04070d',
          card: 'rgba(8, 18, 34, 0.74)',
          border: 'rgba(70, 170, 255, 0.25)',
          borderGlow: 'rgba(70, 170, 255, 0.55)',
          cyan: '#35b6ff',
          orange: '#ff8a3d',
          green: '#3dff9a',
          text: '#eaf3ff',
          muted: '#9ab0c9',
        },
        brand: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#35B6FF',
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
        },
        dr: {
          0: '#3dff9a', // No DR (Neon Green)
          1: '#a3e635', // Mild (Lime)
          2: '#ffb020', // Moderate (Amber)
          3: '#ff8a3d', // Severe (Warm Orange)
          4: '#ff4d6d', // Proliferative (Crimson Red)
        }
      },
      fontFamily: {
        sans: ['Manrope', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
        heading: ['Unbounded', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
