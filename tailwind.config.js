/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#f9f7f2',
        accent: '#8d775f',
        'accent-light': '#d4c8ba',
        'accent-dark': '#6b5948',
        'text-main': '#4a4a4a',
        'text-light': '#9e9e9e',
        'dark-bg': '#2c2c2c',
        'dark-surface': '#3a3a3a',
        'dark-text': '#e0e0e0',
      },
    },
  },
  plugins: [],
}
