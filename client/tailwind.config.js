/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
        tactical: ['"Inter"', "system-ui", "sans-serif"],
      },
      colors: {
        // Theme-aware semantic colors (auto-adapt to light/dark)
        surface: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary: 'var(--color-bg-tertiary)',
          elevated: 'var(--color-bg-elevated)',
          input: 'var(--color-bg-input)',
        },
        content: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        border: {
          primary: 'var(--color-border-primary)',
          subtle: 'var(--color-border-subtle)',
        },
        military: {
          950: "#0d1117",
          900: "#1a1c1e",
          850: "#1e2328",
          800: "#2d3136",
          750: "#343a40",
          700: "#3d4349",
          600: "#4d555c",
          500: "#6b7280",
          400: "#9ca3af",
          300: "#d1d5db",
        },
        tactical: {
          950: "#0a1f0a",
          900: "#132b13",
          800: "#1e3a1e",
          700: "#2d5a2d",
          600: "#3d7a3d",
          500: "#4a9a4a",
          400: "#6abf6a",
          300: "#8fd68f",
          200: "#b5e8b5",
        },
        accent: {
          950: "#2a1800",
          900: "#442200",
          800: "#6b3600",
          700: "#92510a",
          600: "#b8751d",
          500: "#d4942e",
          400: "#f0b240",
          300: "#f5c964",
          200: "#f9dd8a",
          100: "#fcefc0",
        },
        command: {
          950: "#0a1628",
          900: "#0f2240",
          800: "#183060",
          700: "#1e4080",
          600: "#2756a8",
          500: "#3470cc",
          400: "#5090e0",
          300: "#78b0f0",
          200: "#a8d0f8",
          100: "#d4e8fc",
        },
        danger: {
          950: "#1a0505",
          900: "#2d0a0a",
          800: "#4a1212",
          700: "#6e1a1a",
          600: "#922525",
          500: "#b83232",
          400: "#d64545",
          300: "#e87070",
          200: "#f5a0a0",
          100: "#fcd4d4",
        },
      },
      boxShadow: {
        "glow-green":
          "0 0 8px rgba(74, 154, 74, 0.4), 0 0 20px rgba(74, 154, 74, 0.15)",
        "glow-green-lg":
          "0 0 12px rgba(74, 154, 74, 0.5), 0 0 36px rgba(74, 154, 74, 0.2)",
        "glow-amber":
          "0 0 8px rgba(212, 148, 46, 0.4), 0 0 20px rgba(212, 148, 46, 0.15)",
        "glow-amber-lg":
          "0 0 12px rgba(212, 148, 46, 0.5), 0 0 36px rgba(212, 148, 46, 0.2)",
        "glow-blue":
          "0 0 8px rgba(52, 112, 204, 0.4), 0 0 20px rgba(52, 112, 204, 0.15)",
        "glow-blue-lg":
          "0 0 12px rgba(52, 112, 204, 0.5), 0 0 36px rgba(52, 112, 204, 0.2)",
        "glow-red":
          "0 0 8px rgba(184, 50, 50, 0.4), 0 0 20px rgba(184, 50, 50, 0.15)",
        "inner-glow":
          "inset 0 1px 0 rgba(255, 255, 255, 0.05), inset 0 0 20px rgba(52, 112, 204, 0.05)",
        tactical:
          "0 1px 3px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)",
      },
      keyframes: {
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-fast": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(74, 154, 74, 0.3)" },
          "50%": { boxShadow: "0 0 16px rgba(74, 154, 74, 0.6)" },
        },
      },
      animation: {
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
        "scan-line": "scan-line 4s linear infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-in-fast": "fade-in-fast 0.15s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
      backdropBlur: {
        xs: "2px",
        tactical: "12px",
        heavy: "24px",
      },
      borderRadius: {
        tactical: "2px",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-military":
          "linear-gradient(180deg, #0d1117 0%, #1a1c1e 50%, #0d1117 100%)",
      },
    },
  },
  plugins: [],
};
