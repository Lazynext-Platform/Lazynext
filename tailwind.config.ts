import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#4F6EF7',
          hover: '#3D5BD4',
          light: '#E0E9FF',
          lighter: '#F0F4FF',
        },
        surface: {
          DEFAULT: '#0F172A',
          elevated: '#1E293B',
          hover: '#334155',
        },
        // Node type colors
        node: {
          task: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' },
          doc: { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
          decision: { bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412' },
          thread: { bg: '#F5F3FF', border: '#C4B5FD', text: '#5B21B6' },
          pulse: { bg: '#ECFEFF', border: '#A5F3FC', text: '#155E75' },
          automation: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
          table: { bg: '#F0FDFA', border: '#99F6E4', text: '#115E59' },
        },
        quality: {
          high: '#22C55E',
          medium: '#F59E0B',
          low: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],   // 10px
        '2xs+': ['0.6875rem', { lineHeight: '1rem' }],     // 11px
        '3xs': ['0.5625rem', { lineHeight: '0.75rem' }],   // 9px
        '4xs': ['0.5rem', { lineHeight: '0.75rem' }],      // 8px
      },
      animation: {
        'slide-in-right': 'slideInRight 200ms ease-out',
        'slide-in-up': 'slideInUp 200ms ease-out',
        'fade-in': 'fadeIn 150ms ease-out',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@tailwindcss/typography'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@tailwindcss/forms'),
  ],
}

export default config
