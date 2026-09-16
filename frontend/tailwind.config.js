/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#B45309",
        primaryDark: "#92400E",
        success: "#059669",
        successDark: "#047857",
        danger: "#DC2626",
        dangerDark: "#B91C1C",
        warning: "#F59E0B",
        warningDark: "#D97706",
        info: "#0F766E",
        sidebar: "#1F2937",
        navbar: "#FFFFFF",
        background: "#F8F5F2",
        card: "#FFFFFF",
        border: "#E7E5E4",
        text: "#1F2937",
        accent: "#FDE68A",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
      },
      boxShadow: {
        card: "0 12px 30px rgba(15, 23, 42, 0.08)",
        dropdown: "0 16px 40px rgba(15, 23, 42, 0.12)",
      },
      transitionDuration: {
        250: "250ms",
      },
    },
  },
  plugins: [],
};