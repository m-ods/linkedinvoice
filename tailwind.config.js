/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        linkedin: {
          blue: "#0A66C2",
          "blue-hover": "#004182",
          "light-blue": "#70B5F9",
          bg: "#F4F2EE",
          card: "#FFFFFF",
          text: "#191919",
          "text-secondary": "#666666",
          border: "#E0DFDC",
          green: "#057642",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "system-ui",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Fira Sans",
          "Ubuntu",
          "Oxygen",
          "Oxygen Sans",
          "Cantarell",
          "Droid Sans",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "Lucida Grande",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
