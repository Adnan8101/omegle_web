/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './contexts/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'system-ui', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'system-ui', 'sans-serif'],
        text: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'system-ui', 'sans-serif'],
      },
      colors: {
        apple: {
          // Light mode colors
          'white': '#FFFFFF',
          'gray-50': '#FBFBFD',
          'gray-100': '#F2F2F7',
          'gray-200': '#E5E5EA',
          'gray-300': '#D1D1D6',
          'gray-400': '#C7C7CC',
          'gray-500': '#AEAEB2',
          'gray-600': '#8E8E93',
          'gray-700': '#636366',
          'gray-800': '#48484A',
          'gray-900': '#3C3C43',
          // Dark mode colors
          'black': '#000000',
          'dark-50': '#121212',
          'dark-100': '#1C1C1E',
          'dark-200': '#2C2C2E',
          'dark-300': '#38383A',
          'dark-400': '#48484A',
          'dark-500': '#636366',
          'dark-600': '#8E8E93',
          'dark-700': '#AEAEB2',
          'dark-800': '#C7C7CC',
          'dark-900': '#E5E5EA',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-down': 'slideDown 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scaleIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      boxShadow: {
        'apple-sm': '0 1px 3px rgba(0, 0, 0, 0.05)',
        'apple-md': '0 4px 6px rgba(0, 0, 0, 0.07)',
        'apple-lg': '0 10px 15px rgba(0, 0, 0, 0.1)',
        'apple-xl': '0 20px 25px rgba(0, 0, 0, 0.15)',
        'apple-2xl': '0 25px 50px rgba(0, 0, 0, 0.2)',
      },
      borderRadius: {
        'apple': '12px',
        'apple-lg': '16px',
        'apple-xl': '20px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
    },
  },
  plugins: [],
}
