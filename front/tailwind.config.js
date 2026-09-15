/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary-color)",
        accent: "var(--accent-color)",
        "app-bg": "var(--app-bg)",
        "app-surface": "var(--app-surface)",
        "app-chrome": "var(--app-chrome)",
        "app-sidebar": "var(--app-sidebar)",
        "app-text": "var(--app-text)",
        "app-border": "var(--app-border)",
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

