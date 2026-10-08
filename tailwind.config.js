/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        vault: {
          50: '#fdf8f0',
          100: '#faefd8',
          200: '#f5dba8',
          300: '#efc06e',
          400: '#e8a030',
          500: '#d4820a',
          600: '#b45309',
          700: '#92400e',
          800: '#1c1008',
          900: '#0d0804',
        },
        accent: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.25s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'vault-open-left': 'vaultOpenLeft 0.9s cubic-bezier(0.22,1,0.36,1) forwards',
        'vault-open-right': 'vaultOpenRight 0.9s cubic-bezier(0.22,1,0.36,1) forwards',
        'vault-glow': 'vaultGlow 0.6s ease-out 0.5s forwards',
        'treasure-reveal': 'treasureReveal 0.5s ease-out 1s forwards',
        'sparkle': 'sparkle 0.6s ease-out forwards',
        'lock-shake': 'lockShake 0.4s ease-out',
        'lock-unlock': 'lockUnlock 0.3s ease-out forwards',
        'sensitive-lock': 'sensitiveLock 0.4s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        vaultOpenLeft: {
          '0%': { transform: 'rotateY(0deg)', transformOrigin: 'left center' },
          '100%': { transform: 'rotateY(-85deg)', transformOrigin: 'left center' },
        },
        vaultOpenRight: {
          '0%': { transform: 'rotateY(0deg)', transformOrigin: 'right center' },
          '100%': { transform: 'rotateY(85deg)', transformOrigin: 'right center' },
        },
        vaultGlow: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        treasureReveal: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        sparkle: {
          '0%': { opacity: '0', transform: 'scale(0) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1.2) rotate(180deg)' },
          '100%': { opacity: '0', transform: 'scale(0) rotate(360deg)' },
        },
        lockShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-4px)' },
          '40%': { transform: 'translateX(4px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        lockUnlock: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(-20deg)' },
        },
        sensitiveLock: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};
