/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      colors: {
        apple: {
          light: '#f5f5f7',
          gray: '#86868b',
          dark: '#1d1d1f',
          blue: '#2997ff',
        }
      }
    },
  },
  plugins: [],
}
