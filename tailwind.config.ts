import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta "Vira Canção": quente, elegante — serve emoção E zoeira.
        cream: "#FDF8F3",
        ink: "#2A1F1D",
        wine: {
          50: "#FCF3F4",
          100: "#F8E4E7",
          200: "#F0C6CD",
          300: "#E39BA8",
          400: "#D06B80",
          500: "#B94A62",
          600: "#9C334C",
          700: "#7D2740",
          800: "#5E1D31",
          900: "#421624",
        },
        gold: {
          400: "#E8B44A",
          500: "#D9A03C",
          600: "#B8842E",
        },
      },
      fontFamily: {
        serif: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(185,74,98,.35)" },
          "50%": { transform: "scale(1.015)", boxShadow: "0 0 0 12px rgba(185,74,98,0)" },
        },
        equalize: {
          "0%, 100%": { transform: "scaleY(.35)" },
          "50%": { transform: "scaleY(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up .5s ease-out both",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        equalize: "equalize 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
