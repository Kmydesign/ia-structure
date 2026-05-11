/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "SF Mono",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        surface: {
          DEFAULT: "#0a0a0b",
          raised: "#111113",
          overlay: "#18181b",
          "overlay-2": "#1e1e22",
          border: "#27272a",
          "border-light": "#3f3f46",
        },
        text: {
          primary: "#fafafa",
          secondary: "#a1a1aa",
          tertiary: "#71717a",
          muted: "#52525b",
        },
        accent: {
          DEFAULT: "#8b5cf6",
          hover: "#a78bfa",
          muted: "#6d28d9",
          glow: "rgba(139, 92, 246, 0.15)",
        },
        node: {
          page: "#3b82f6",
          component: "#8b5cf6",
          api: "#f59e0b",
          database: "#10b981",
          auth: "#ef4444",
          action: "#06b6d4",
          decision: "#f97316",
          error: "#dc2626",
        },
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-in": "slideIn 0.25s ease-out",
        "scale-in": "scaleIn 0.15s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
