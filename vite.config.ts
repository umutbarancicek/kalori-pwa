import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Kalori Takip',
        short_name: 'Kalori Takip',
        description: 'Sunucusuz, tarayıcıda çalışan kişisel kalori takip uygulaması',
        start_url: '.',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#16a34a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,gz}'],
        // The bulk food dataset (tens of MB) lives under data/ and is cached lazily
        // by the CacheFirst runtime rule below on first use — precaching it would
        // force the service worker to download the whole thing before activating.
        globIgnores: ['data/**'],
        runtimeCaching: [
          {
            urlPattern: /\/data\/.*\.(json|gz)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'bulk-food-data' },
          },
          {
            urlPattern: /^https:\/\/(world\.openfoodfacts\.org|vision\.googleapis\.com)\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
});
