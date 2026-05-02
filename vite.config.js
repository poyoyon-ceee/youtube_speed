import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ポップアップ用ビルド設定（ES形式）
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
        popup: resolve(__dirname, 'index.html'),
      },
    },
  },
});