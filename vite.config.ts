import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/sub75-web/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sub75',
        short_name: 'Sub75',
        description: 'Hyrox-Trainingsplan · Sub 75 / Sub 70',
        theme_color: '#0a0f16',
        background_color: '#0a0f16',
        display: 'standalone',
        start_url: '/sub75-web/',
        scope: '/sub75-web/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      },
    }),
  ],
})
