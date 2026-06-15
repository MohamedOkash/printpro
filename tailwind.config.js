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
  theme: {
    extend: {
      borderRadius: {
        sm: '16px',
        md: '20px',
        lg: '24px',
      },
      boxShadow: {
        glow: '0 24px 80px rgba(15, 23, 42, 0.22)',
        soft: '0 18px 48px rgba(15, 23, 42, 0.18)',
        card: '0 12px 32px rgba(15, 23, 42, 0.14)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        softfade: 'softfade .2s ease-out both',
      },
      keyframes: {
        softfade: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

