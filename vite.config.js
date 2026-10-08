import { defineConfig } from 'vite';
import path from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  base: './',
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ['./src/'],
      entryRoot: './src'
    })
  ],
  publicDir: 'models',
  resolve: {
    conditions: ['onnxruntime-web-use-extern-wasm'],
    alias: {
      '@': path.resolve(import.meta.dirname, './src')
    }
  },
  server: {
    open: '/test/index.html'
  },
  build: {
    sourcemap: true,
    lib: {
      entry: {
        'index': './src/index.ts',
        'openseadragon/index': './src/openseadragon/index.ts'
      },
      formats: ['es']
    },
    rollupOptions: {
      output: {
        assetFileNames: 'annotorious-plugin-sam.[ext]',
      },
      external: ['fs', 'path', 'crypto']
    }
  }
});