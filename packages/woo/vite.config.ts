// vite.config.ts
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'path';

export default defineConfig({
  build: {
    sourcemap: false,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'fern_woo',
      fileName: 'fern_woo',
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['typescript', '@ferndev/core', 'nanostores'],
    }
  },
  plugins: [dts({
    insertTypesEntry: true,
  })],
})