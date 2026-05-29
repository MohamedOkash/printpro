/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    {
      pattern: /^(bg|text|border)-(emerald|purple|amber|sky|rose|indigo|orange|teal|violet|pink|slate|blue)-(400|500|600)(\/\d+)?$/,
    },
    {
      pattern: /^(bg|text|border)-(emerald|purple|amber|sky|rose|indigo|orange|teal|violet|pink|slate|blue)-(300|400|500|600)\/(10|15|20|25|40)$/,
    },
  ],
  theme: { extend: {} },
  plugins: [],
}

