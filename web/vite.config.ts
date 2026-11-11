import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        name: 'Raaz: AI Detective',
        short_name: 'Raaz',
        description: 'A hybrid-AI detective game: suspects run on-device, new cases are written in the cloud.',
        theme_color: '#0d0b09',
        background_color: '#0d0b09',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,woff2}'], maximumFileSizeToCacheInBytes: 5_000_000 },
    }),
  ],
})
