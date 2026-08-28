import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#161F4C",
          deep: "#0C1130",
          soft: "#2A3570",
        },
        orange: {
          DEFAULT: "#F5821F",
          dark: "#D96A0C",
        },
        pink: {
          DEFAULT: "#ED4C87",
        },
        success: {
          DEFAULT: "#1FA971",
          soft: "#E4F8EF",
          text: "#127A50",
        },
        danger: {
          DEFAULT: "#E5484D",
          soft: "#FDEAEA",
          text: "#B7262A",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          soft: "#F4F5FB",
        },
        ink: {
          DEFAULT: "#171B3D",
          muted: "#6C7191",
        },
        border: "#E5E7F4",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        sm: "10px",
        md: "16px",
        lg: "24px",
      },
      boxShadow: {
        card: "0 10px 28px -14px rgba(23,32,76,.25)",
        pop: "0 20px 44px -18px rgba(23,32,76,.4)",
      },
    },
  },
  plugins: [],
};

export default config;
