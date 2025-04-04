/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      backgroundColor: {
        dark: 'var(--background-color)',
        light: 'var(--background-color)',
      },
      textColor: {
        dark: 'var(--foreground-color)',
        light: 'var(--foreground-color)',
      },
    },
  },
  plugins: [],
  // Force dark mode to take precedence
  important: true,
  corePlugins: {
    preflight: true,
  },
} 