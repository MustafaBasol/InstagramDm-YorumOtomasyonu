import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--color-ink)",
        soft: "var(--color-soft)",
        surface: "var(--color-surface)",
        line: "var(--color-line)",
        accent: {
          coral: "var(--color-coral)",
          amber: "var(--color-amber)",
          rose: "var(--color-rose)",
          plum: "var(--color-plum)",
        },
      },
      boxShadow: {
        panel: "0 24px 80px rgba(15, 23, 42, 0.18)",
      },
      backgroundImage: {
        "hero-mesh":
          "radial-gradient(circle at top left, rgba(249, 115, 22, 0.24), transparent 30%), radial-gradient(circle at top right, rgba(225, 29, 72, 0.18), transparent 34%), linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(17, 24, 39, 0.84))",
      },
      animation: {
        "fade-up": "fade-up 500ms ease-out both",
      },
      keyframes: {
        "fade-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(12px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;

