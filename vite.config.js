import { defineConfig } from 'vite';
import path from 'path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { sveltePreprocess } from 'svelte-preprocess';
import dts from 'vite-plugin-dts';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    svelte({ preprocess: sveltePreprocess() }),
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
    open: '/test/index.html',
  },
  build: {
    sourcemap: true,
    lib: {
      entry: './src/index.ts',
      name: 'AnnotoriousSAM',
      formats: ['es', 'umd'],
      fileName: (format) => 
        format === 'umd' ? `annotorious-plugin-sam.js` : `annotorious-plugin-sam.es.js` 
    },
    rollupOptions: {
      output: {
        assetFileNames: 'annotorious-plugin-sam.[ext]'
      }
    }
  }
});