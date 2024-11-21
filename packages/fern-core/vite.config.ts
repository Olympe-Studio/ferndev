// vite.config.ts
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'path';

export default defineConfig({
  build: {
    sourcemap: false,
    lib: {
      entry: path.resolve(__dirname, 'index.ts'),
      name: 'fern_core',
      fileName: 'fern_core',
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['typescript']
    }
  },
  plugins: [dts({
    insertTypesEntry: true,
    include: ['index.ts'],
    exclude: ['node_modules', 'dist'],
    rollupTypes: true,                      // Consolidate type declarations
    staticImport: true,                     // Better handling of static imports
  })],
})