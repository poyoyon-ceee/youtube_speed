import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// コンテンツスクリプト専用ビルド設定（IIFE形式 / 依存を全てインライン化）
// Chrome拡張のcontent_scriptsはESモジュール非対応のため、
// import文を含まない単一ファイルに束ねる必要がある。
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false, // ポップアップのビルド成果物を保持する
    lib: {
      entry: resolve(__dirname, 'src/content.js'),
      formats: ['iife'],
      name: 'YTSpeedController',
      fileName: () => 'content.js', // dist/src/content.js に出力
    },
    rollupOptions: {
      output: {
        entryFileNames: 'src/content.js',
      },
    },
  },
});
