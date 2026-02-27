/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        royal: '#1E40AF',
        'royal-dark': '#1a3a9e',
        saffron: '#F59E0B',
        'saffron-dark': '#d97706',
        sky: '#DBEAFE',
        cream: '#FFFBEB',
        slate: '#1F2937',
        'light-border': '#E5E7EB',
      },
      fontFamily: {
        heading: ['Poppins', 'Montserrat', 'sans-serif'],
        body: ['Inter', 'Source Sans 3', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 6px 20px rgba(0, 0, 0, 0.1)',
        lift: '0 4px 12px rgba(0, 0, 0, 0.08)',
      },
      maxWidth: {
        container: '1200px',
      },
      transitionDuration: {
        micro: '200ms',
      },
      transitionTimingFunction: {
        micro: 'ease-in-out',
      },
    },
  },
  plugins: [],
}