import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        marinho: {
          50: "#eef3fa",
          100: "#d6e1f1",
          200: "#adc3e3",
          300: "#7c9dcf",
          400: "#4f77b6",
          500: "#335a99",
          600: "#26467b",
          700: "#1d3762",
          800: "#152a4b",
          900: "#0f1f38",
          950: "#0a1526",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
