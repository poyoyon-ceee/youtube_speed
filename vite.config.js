import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  publicDir: 'public',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // ポップアップ用HTML (index.html -> dist/index.html)
        popup: resolve(__dirname, 'index.html'),
        // content script は IIFE 形式でバンドル
        content: resolve(__dirname, 'src/content.js'),
      },
      output: {
        // content.js は dist/src/content.js に固定出力
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'content') return 'src/content.js';
          return 'assets/[name]-[hash].js';
        },
        // content.js は IIFE (即時実行) 形式に
        format: 'es',
      },
    },
  },
});