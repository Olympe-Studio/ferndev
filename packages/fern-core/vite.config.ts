// vite.config.ts
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'path';

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, 'index.ts'),
      name: 'fern_core',
      fileName: 'fern_core'
    },
  },
  plugins: [dts({
    insertTypesEntry: true,
  })],
})