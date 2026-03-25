/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: {
          bg: "rgb(var(--c-bg) / <alpha-value>)",
          elevated: "rgb(var(--c-elevated) / <alpha-value>)",
          grid: "rgb(var(--c-grid) / <alpha-value>)",
          panel: "rgb(var(--c-elevated) / 0.72)",
          border: "rgb(var(--c-border) / var(--c-border-a))",
          accent: "rgb(var(--c-accent) / <alpha-value>)",
          "accent-dim": "rgb(var(--c-accent-dim) / <alpha-value>)",
          muted: "rgb(var(--c-muted) / <alpha-value>)",
          ink: "rgb(var(--c-ink) / <alpha-value>)",
        },
      },
      boxShadow: {
        bar: "0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.45)",
        panel: "0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
        node: "0 0 0 1px rgba(255,255,255,0.07), 0 12px 40px rgba(0,0,0,0.35)",
        "node-selected":
          "0 0 0 1px rgba(45,212,191,0.35), 0 0 24px rgba(45,212,191,0.12), 0 12px 40px rgba(0,0,0,0.4)",
      },
      backgroundImage: {
        "app-radial":
          "radial-gradient(ellipse 100% 70% at 50% -15%, rgba(45,212,191,0.14), transparent 52%), radial-gradient(ellipse 60% 45% at 100% 0%, rgba(56,189,248,0.08), transparent 50%)",
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
