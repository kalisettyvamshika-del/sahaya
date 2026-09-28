/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#EEF2FB',
          100: '#D9E1F4',
          200: '#B6C7E8',
          300: '#8DA9DA',
          400: '#5C7BC6',
          500: '#3A5BAE',
          600: '#2B4585',
          700: '#1F3461',
          800: '#162447',
          900: '#0E1733',
        },
        violet: {
          50: '#F4F1FF',
          100: '#E5DCFF',
          200: '#C9B4FF',
          300: '#A889FF',
          400: '#8A6BFF',
          500: '#6E4DFF',
          600: '#5536E0',
        },
        rose: {
          500: '#F43F5E',
          600: '#E11D48',
          700: '#BE123C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(22, 36, 71, 0.06), 0 2px 8px -2px rgba(22, 36, 71, 0.04)',
        'card-hover': '0 8px 30px -4px rgba(22, 36, 71, 0.10), 0 4px 12px -2px rgba(22, 36, 71, 0.06)',
        emergency: '0 0 0 4px rgba(244, 63, 94, 0.20), 0 8px 30px -4px rgba(244, 63, 94, 0.35)',
      },
      animation: {
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'fade-in': 'fadeIn 0.35s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.03)', opacity: '0.92' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
