import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "buck-green": "#10B981",
        "buck-dark": "#1A1A2E",
        "buck-darker": "#12122A",
        "buck-card": "#242444",
        "buck-gold": "#FBBF24",
        "buck-coral": "#F97066",
        "buck-blue": "#60A5FA",
      },
    },
  },
  plugins: [],
};

export default config;
