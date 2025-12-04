/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F7F3EE",
        beige: "#ECE2D3",
        gold: "#C9A66B",
        "gold-soft": "#E5D6C3",
        "text-soft": "#7A6A56",
        "text-dark": "#222222",
      },
      boxShadow: {
        invite: "0 18px 45px rgba(0,0,0,0.15)",
      },
      borderRadius: {
        invite: "35px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 700ms ease-out forwards",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
