/*SSN Engineering College - Professional Color Scheme*/
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ssn-blue': '#003D82',
        'ssn-dark': '#001a3d',
        'ssn-light': '#e8f0f8',
      },
    },
  },
  plugins: [],
}