import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.VITE_BASE_PATH ?? './';

export default defineConfig({
  // محليًا تبقى الأصول نسبية. يمرر GitHub Actions مسار المستودع صراحةً
  // (`/<repo>/` لمشروع Pages أو `/` لمستودع username.github.io).
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-180.png', 'favicon.png'],
      manifest: {
        name: 'طقس جدة — الرياح والرطوبة',
        short_name: 'طقس جدة',
        description: 'لوحة قراءة لرياح ورطوبة جدة على مدى سبعة أيام.',
        lang: 'ar',
        dir: 'rtl',
        id: './',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#0F172A',
        theme_color: '#0F172A',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true
  }
});
