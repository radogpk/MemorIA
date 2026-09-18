import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        card: "var(--card)",
        primary: {
          DEFAULT: "#3b82f6",
          hover: "#2563eb",
          foreground: "#ffffff",
        },
        academic: {
          math: "#3b82f6",
          physics: "#8b5cf6",
          networks: "#06b6d4",
          systems: "#10b981",
          exam: "#ef4444",
          task: "#f59e0b",
          meeting: "#6366f1"
        }
      },
    },
  },
  plugins: [],
};
export default config;
