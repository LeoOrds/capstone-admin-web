/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // We define your specific brand colors here!
      colors: {
        brand: {
          DEFAULT: '#0891b2', // A rich teal matching the logo icon (cyan-600)
          dark: '#164e63',    // A deep slate blue for sidebars/text (cyan-900)
          light: '#22d3ee',   // A bright cyan for accents/hover states (cyan-400)
          bg: '#f0f9ff',      // A very very light blue tint for backgrounds (sky-50)
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Let's use a clean, modern font
      }
    },
  },
  plugins: [],
}