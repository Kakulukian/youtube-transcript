/// <reference types="vite/client" />

import { defineConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'YoutubeTranscript',
      formats: ['es', 'cjs'],
    },
    target: 'node18',
    sourcemap: true,
    minify: true,
    rollupOptions: {
      external: ['node-html-parser'],
    },
  },

  plugins: [dts()],

  test: {
    globals: true,
    environment: 'node'
  }
})