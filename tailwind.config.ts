import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefbf5",
          100: "#d6f5e6",
          200: "#b0e9d1",
          300: "#7bd7b6",
          400: "#45bd97",
          500: "#22a27e",
          600: "#148367",
          700: "#106953",
          800: "#105344",
          900: "#0e4539",
          950: "#05271f",
        },
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d5d9e2",
          300: "#b0b8c9",
          400: "#8591ab",
          500: "#677491",
          600: "#525d78",
          700: "#434c62",
          800: "#3a4153",
          900: "#343947",
          950: "#22252f",
        },
        accent: {
          50: "#fff8eb",
          100: "#ffecc6",
          200: "#ffd788",
          300: "#ffbc4a",
          400: "#ffa11f",
          500: "#f97f07",
          600: "#dd5a02",
          700: "#b73c06",
          800: "#942e0c",
          900: "#7a270d",
        },
      },
      fontFamily: {
        sans: [
          "Inter Variable",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px -12px rgba(16, 24, 40, 0.16)",
        float: "0 24px 60px -24px rgba(16, 24, 40, 0.35)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        "slide-up": "slide-up 0.4s ease-out both",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
