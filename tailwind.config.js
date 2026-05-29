/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // safelist ensures dynamic color classes (text-emerald-400 etc.) are included
  safelist: [
    { pattern: /^(text|bg|border)-(emerald|purple|amber|sky|rose|indigo|teal|violet|pink|orange|red|blue|slate|green)-(400|500|600|300|200|100)/ },
    { pattern: /^(bg|border)-(emerald|purple|amber|sky|rose|indigo|teal|violet|pink|orange|red|blue)-(500)\/(10|15|20|25|30|40)/ },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
