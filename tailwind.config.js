/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0B1E3D',
          900: '#0F2A52',
          800: '#15386A'
        },
        brand: {
          blue: '#1568D4',
          green: '#1BA672',
          orange: '#E88A2E',
          red: '#E14848'
        }
      }
    }
  },
  plugins: []
};
