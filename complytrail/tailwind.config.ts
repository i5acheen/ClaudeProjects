import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe6fe",
          500: "#3b5bdb",
          600: "#2f4bc7",
          700: "#273da3",
        },
      },
    },
  },
  plugins: [],
};

export default config;
