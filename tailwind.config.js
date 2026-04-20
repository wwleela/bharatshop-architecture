// tailwind.config.js — BharatShop OS 2026
// NativeWind 4 preset + design token extensions.
// Tokens mirror constants/Theme.ts — keep in sync if either changes.

const { hairlineWidth } = require('nativewind/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background:    '#0F0F0F',
        surface:       '#1A1A1A',
        border:        '#2A2A2A',
        amber:         '#FFBF00',
        emerald:       '#50C878',
        crimson:       '#DC2626',
        cobalt:        '#2563EB',
        'text-primary':   '#F5F5F5',
        'text-secondary': '#A3A3A3',
        'text-muted':     '#525252',
        'text-inverse':   '#0F0F0F',
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
    },
  },
  plugins: [],
};
