import { defineConfig } from 'electron-vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [],
    build: {
      outDir: 'dist/main',
      lib: {
        entry: 'src/main/main.ts',
        formats: ['cjs'],
      },
      rollupOptions: {
        external: ['electron', 'better-sqlite3', '@nut-tree-fork/nut-js', 'keytar', 'node-llama-cpp'],
      },
    },
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@shared': resolve('src/shared'),
      },
    },
  },
  preload: {
    plugins: [],
    build: {
      outDir: 'dist/preload',
      lib: {
        entry: 'src/preload/preload.ts',
        formats: ['cjs'],
      },
      rollupOptions: {
        external: ['electron'],
      },
    },
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
      },
    },
  },
  renderer: {
    plugins: [react()],
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: {
          index: resolve('src/renderer/index.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer'),
        '@shared': resolve('src/shared'),
      },
    },

  },
});