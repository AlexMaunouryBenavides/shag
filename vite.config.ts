/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// Le site est servi sous un sous-chemin sur GitHub Pages (https://<user>.github.io/<repo>/).
// BASE_PATH est fourni par la GitHub Action ; en local on sert à la racine.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [svelte()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
