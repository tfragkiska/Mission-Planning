/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        military: {
          900: "#1a1c1e",
          800: "#2d3136",
          700: "#3d4349",
          600: "#4d555c",
          500: "#6b7280",
          400: "#9ca3af",
          300: "#d1d5db",
        },
      },
    },
  },
  plugins: [],
};
