import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "garden-purple": "#C084FC",
        "garden-pink": "#F472B6",
        "garden-ivory": "#FFF8F0",
        "garden-black": "#000000",
        "garden-indigo": "#4F46E5",
      },
      fontFamily: {
        cormorant: ["Cormorant Garamond", "serif"],
        caveat: ["Caveat", "cursive"],
      },
      keyframes: {
        sway: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        drift: {
          "0%": { transform: "translateX(0px) translateY(0px)" },
          "25%": { transform: "translateX(20px) translateY(-15px)" },
          "50%": { transform: "translateX(-10px) translateY(-30px)" },
          "75%": { transform: "translateX(15px) translateY(-20px)" },
          "100%": { transform: "translateX(0px) translateY(0px)" },
        },
        wingFlap: {
          "0%, 100%": { transform: "scaleX(1)" },
          "50%": { transform: "scaleX(0.3)" },
        },
        zzz: {
          "0%": { opacity: "0", transform: "translateY(0px) scale(0.5)" },
          "50%": { opacity: "1", transform: "translateY(-20px) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(-40px) scale(1.2)" },
        },
      },
      animation: {
        sway: "sway 3s ease-in-out infinite",
        "sway-slow": "sway 5s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite",
        drift: "drift 8s ease-in-out infinite",
        wingFlap: "wingFlap 0.3s ease-in-out infinite",
        zzz: "zzz 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
