/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        kivo: {
          bg: '#050505',
          navy: '#070B14',
          surface: '#0B101D',
          'surface-card': 'rgba(15, 22, 38, 0.75)',
          'surface-light': '#141D32',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-highlight': 'rgba(8, 123, 255, 0.3)',
          blue: '#087BFF',
          cyan: '#00D9F5',
          purple: '#A52BFA',
          glow: 'rgba(8, 123, 255, 0.15)',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'kivo-gradient': 'linear-gradient(135deg, #087BFF 0%, #00D9F5 50%, #A52BFA 100%)',
        'kivo-gradient-h': 'linear-gradient(90deg, #087BFF 0%, #00D9F5 50%, #A52BFA 100%)',
        'kivo-gradient-subtle': 'linear-gradient(135deg, rgba(8,123,255,0.15) 0%, rgba(0,217,245,0.08) 50%, rgba(165,43,250,0.15) 100%)',
        'kivo-glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
      },
      boxShadow: {
        'glow-blue': '0 0 30px -5px rgba(8, 123, 255, 0.3)',
        'glow-cyan': '0 0 30px -5px rgba(0, 217, 245, 0.3)',
        'glow-purple': '0 0 30px -5px rgba(165, 43, 250, 0.3)',
        'glow-kivo': '0 0 50px -10px rgba(0, 217, 245, 0.25), 0 0 80px -20px rgba(165, 43, 250, 0.2)',
        'glass-card': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'float-slow': 'float 8s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
        'gradient-x': 'gradientX 8s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        gradientX: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
      },
    },
  },
  plugins: [],
}
