/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// Le site est servi sous un sous-chemin sur GitHub Pages (https://<user>.github.io/<repo>/).
// BASE_PATH est fourni par la GitHub Action ; en local on sert à la racine.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [svelte()],
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
  worker: {
    format: 'es',
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        'spike-sqlite': resolve(import.meta.dirname, 'spike-sqlite.html'),
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
