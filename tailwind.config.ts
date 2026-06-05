import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        gumleaf: "#4b5fe8",
        banksia: "#b7791f",
        coral: "#d65452",
        harbour: "#0e8fb4"
      },
      boxShadow: {
        panel: "0 14px 34px rgba(75, 95, 232, 0.055)"
      }
    }
  },
  plugins: []
};

export default config;
