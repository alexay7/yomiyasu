/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary-color)",
        accent: "var(--accent-color)",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      width: {
        "fill": "-webkit-fill-available"
      },
      height: {
        "fill": "-webkit-fill-available"
      },
    },
  },
  plugins: [],
  important: true,
  corePlugins: {
    preflight: false
  },
  darkMode: "class"
}