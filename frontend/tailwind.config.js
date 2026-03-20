/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Mono"', 'monospace'],
        body:    ['"Inter"', 'sans-serif'],
      },
      colors: {
        surface:  '#0B0E14',
        panel:    '#111620',
        border:   '#1E2433',
        muted:    '#2A3249',
        accent:   '#00D4FF',
        accent2:  '#7B61FF',
        up:       '#00E5A0',
        down:     '#FF4D6A',
        neutral:  '#F5A623',
      },
    },
  },
  plugins: [],
}
