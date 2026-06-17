import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./services/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        ocean: "#0f766e",
        steel: "#475569",
        amberline: "#d97706",
      },
      boxShadow: {
        soft: "0 20px 60px -30px rgba(15, 23, 42, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
