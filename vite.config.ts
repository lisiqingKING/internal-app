import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

const DEV_PORT = 5273

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  define: {
    __DEV_PORT__: DEV_PORT,
  },
  server: {
    port: DEV_PORT,
    proxy: {
      '/proxy': {
        target: 'http://localhost:3456',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})