/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'burnt-orange': {
          DEFAULT: '#CC5500',
          light: '#E06B1A',
          dark: '#A34400',
        },
        navy: {
          DEFAULT: '#1B2A4A',
          light: '#2A3D66',
          dark: '#111D33',
        },
        cream: {
          DEFAULT: '#FFF8F0',
          dark: '#F5EDE0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        heading: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
