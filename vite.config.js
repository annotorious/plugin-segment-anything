import { defineConfig } from 'vite';
import path from 'path';
import dts from 'vite-plugin-dts';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/onnxruntime-web/dist/*.wasm',
          dest: 'node_modules/.vite/deps'
        }
      ]
    }),
    dts({
      insertTypesEntry: true,
      include: ['./src/'],
      entryRoot: './src'
    })
  ],
  publicDir: 'models',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
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
        globals: {
          fs: 'fs',
          path: 'path',
          crypto: 'crypto'
        }
      },
      external: ['fs', 'path', 'crypto']
    }
  }
});