import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, 'secure'), '');
  return {
    root: path.resolve(__dirname, './docs'),
    envDir: path.resolve(__dirname, 'secure'),
    build: {
      outDir: path.resolve(__dirname, './archive/dist'),
      emptyOutDir: true,
    },
    server: {
      port: 8081,
      strictPort: true,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        // 'prompt' = we control the moment of update via the UpdateBanner
        // (never window.confirm — house rule), matching the UX drafted in
        // plans/VERSION-DETECTION-AND-AUTO-REFRESH.md.
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'favicon-32x32.png', 'favicon-16x16.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'Sentinel SportsLab',
          short_name: 'SportsLab',
          description: 'Athlete monitoring & performance intelligence for sport scientists, coaches, and performance staff.',
          theme_color: '#4f46e5',
          background_color: '#0d1829',
          display: 'standalone',
          orientation: 'any',
          scope: '/',
          start_url: '/dashboard',
          categories: ['sports', 'fitness', 'health'],
          icons: [
            { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Precache the app shell (JS/CSS/HTML + small icons). Marketing
          // images and the 2 MB logo are runtime-cached instead so installs
          // stay light.
          globPatterns: ['**/*.{js,css,html,ico,svg,woff2}', '*.png'],
          globIgnores: ['images/**', 'body-image.jpeg'],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              // App images (logo, landing shots) — cache after first view.
              urlPattern: /\/images\/.*\.(png|jpe?g|svg|webp)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'app-images',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              // Supabase REST reads — network first, 1 h offline fallback.
              // Auth endpoints are NOT matched (only /rest/v1/).
              urlPattern: /^https:\/\/[a-z0-9]+\.supabase\.co\/rest\/v1\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api',
                networkTimeoutSeconds: 10,
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
              },
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './docs'),
      }
    }
  };
});
