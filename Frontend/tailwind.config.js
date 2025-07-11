/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'diff-add': '#e6ffec',
        'diff-remove': '#ffebe9',
        'diff-add-dark': '#0d1b12',
        'diff-remove-dark': '#1b1110',
        'gutter-normal': '#f0f0f0',
        'gutter-active': '#e2e2e2',
        'gutter-dark-normal': '#2d2d2d',
        'gutter-dark-active': '#3d3d3d',
      },
      fontFamily: {
        'mono': ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}

