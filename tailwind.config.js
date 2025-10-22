/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Primary Brand - Fresh Grass Green (Vibrant & Modern)
        primary: {
          50: '#f0fdf4', // Lightest - card backgrounds
          100: '#dcfce7', // Light accents
          200: '#bbf7d0', // Subtle highlights
          300: '#86efac', // Medium highlights
          400: '#4ade80', // Active states
          500: '#22c55e', // PRIMARY BRAND COLOR
          600: '#16a34a', // Hover states
          700: '#15803d', // Dark accents
          800: '#166534', // Headers/emphasis
          900: '#14532d', // Deepest - dark text
        },
        // Secondary - Earth Tones (Complementary)
        secondary: {
          brown: '#8b4513', // Rich soil
          tan: '#d2b48c', // Healthy grass roots
          sky: '#87ceeb', // Clear sky blue
          dirt: '#a0826d', // Earthy brown
        },
        // Semantic Colors
        success: '#22c55e', // Completed/success
        warning: '#f59e0b', // Pending/warning
        error: '#ef4444', // Issues/errors
        info: '#3b82f6', // Informational

        // Neutral Palette (Modern Gray Scale)
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
      },
      // Gradient Utilities
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        'gradient-primary-soft':
          'linear-gradient(135deg, #86efac 0%, #4ade80 100%)',
        'gradient-dark': 'linear-gradient(135deg, #166534 0%, #14532d 100%)',
        'gradient-sky': 'linear-gradient(135deg, #87ceeb 0%, #4ade80 100%)',
        'gradient-earth': 'linear-gradient(135deg, #d2b48c 0%, #8b4513 100%)',
      },
      // Enhanced Shadows
      boxShadow: {
        soft: '0 2px 8px rgba(34, 197, 94, 0.1)',
        primary: '0 4px 16px rgba(34, 197, 94, 0.2)',
        'primary-lg': '0 8px 32px rgba(34, 197, 94, 0.25)',
        elevated: '0 8px 16px rgba(0, 0, 0, 0.1)',
      },
      // Border Radius Scale
      borderRadius: {
        card: '12px',
        button: '8px',
        input: '8px',
        badge: '16px',
      },
      // Spacing for consistent layout
      spacing: {
        18: '4.5rem',
        88: '22rem',
      },
      // Animation presets
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};
