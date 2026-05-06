/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './docs/**/*.{html,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg:       '#0D1829',
          surface:  '#132338',
          elevated: '#1A2D48',
          border:   '#243A58',
          input:    '#0F1C30',
          muted:    '#1A2D48',
        },
      },
    },
  },
  plugins: [],
};
