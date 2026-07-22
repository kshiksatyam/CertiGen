/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Outfit'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
      },
      colors: {
        background: "#0d0f12",
        card:       "#151922",
        primary:    "#6366f1",
        "primary-hover": "#4f46e5",
        border:     "#242b3d",
        muted:      "#94a3b8",
        foreground: "#f8fafc",
      },
      boxShadow: {
        card:    "0 0 0 1px rgba(99,102,241,0.08), 0 24px 64px rgba(0,0,0,0.45)",
        primary: "0 4px 16px rgba(99,102,241,0.30)",
        "primary-lg": "0 8px 24px rgba(99,102,241,0.40)",
        glow: "0 0 0 3px rgba(99,102,241,0.18)",
      },
      keyframes: {
        "slide-up": {
          from: { opacity: "0", transform: "translateY(18px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px) scale(1)" },
          "50%":       { transform: "translateY(-24px) scale(1.04)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%":       { transform: "translateX(-5px)" },
          "60%":       { transform: "translateX(5px)" },
          "80%":       { transform: "translateX(-3px)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to:   { backgroundPosition: "-200% 0" },
        },
        spin: {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.35s cubic-bezier(0.16,1,0.3,1) both",
        float:      "float 8s ease-in-out infinite",
        "float-delayed": "float 8s ease-in-out infinite -4s",
        shake:      "shake 0.35s cubic-bezier(0.36,0.07,0.19,0.97)",
        shimmer:    "shimmer 1.4s infinite",
        spin:       "spin 0.7s linear infinite",
      },
    },
  },
  plugins: [],
};
