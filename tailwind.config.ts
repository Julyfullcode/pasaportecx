import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-poppins)", "sans-serif"],
        sans: ["var(--font-nunito)", "sans-serif"],
      },
      borderRadius: { card: "1rem" },
      boxShadow: { soft: "0 10px 30px rgba(11,59,96,.10)" },
    },
  },
  plugins: [],
} satisfies Config;
