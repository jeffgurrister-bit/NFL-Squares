import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0d1f17",
        forest: {
          DEFAULT: "#0f3d2e",
          dark: "#0a2a1f",
        },
        accent: {
          gold: "#f1b927",
          goldSoft: "#fde9b1",
        },
        surface: "#f7f7f5",
        line: "#e5e5e1",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
