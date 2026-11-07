import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07120D",
        paper: "#F4F6F1",
        orange: { DEFAULT: "#F77F00", dark: "#A04F00" },
        green: { DEFAULT: "#009E60", dark: "#00703C", deep: "#0B5130" },
        muted: "#4A5A51",
        line: "#C9D3CD",
      },
      fontFamily: {
        display: ["Unbounded", "sans-serif"],
        sans: ["Inter Tight", "system-ui", "sans-serif"],
        serif: ["Instrument Serif", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
