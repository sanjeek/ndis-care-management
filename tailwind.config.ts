import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        gumleaf: "#4f46e5",
        banksia: "#c88728",
        coral: "#d65452",
        harbour: "#2563eb"
      },
      boxShadow: {
        panel: "0 18px 45px rgba(37, 99, 235, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
