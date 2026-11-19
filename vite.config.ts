/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Le site est servi sous un sous-chemin sur GitHub Pages (https://<user>.github.io/<repo>/).
// BASE_PATH est fourni par la GitHub Action ; en local on sert à la racine.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    svelte(),
    VitePWA({
      // Mise à jour pilotée par l'app (src/lib/pwa.ts) : jamais au milieu d'une unité.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/favicon.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Шаг — le russe pas à pas',
        short_name: 'Шаг',
        description: 'Apprendre le russe de zéro, 20 minutes par jour, en suivant un plan.',
        lang: 'fr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#EEF1F3',
        theme_color: '#EEF1F3',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // L'application, le moteur SQLite (wasm), les polices et le paquet de contenu sont précachés.
        // L'audio est mis en cache par phase à l'exécution (voir src/lib/audio.ts).
        globPatterns: ['**/*.{js,css,html,wasm,woff2,png,svg}', 'content/pack.json'],
        globIgnores: ['content/audio/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/content/audio/'),
            handler: 'CacheFirst',
            options: { cacheName: 'shag-audio' },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
  worker: {
    format: 'es',
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
