import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: '::',
    port: 8080,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
    watch: {
      // Prevent ELOOP errors from nix-darwin's Apple SDK symlinks
      ignored: ['**/.devenv/**', '**/node_modules/**', '/nix/**'],
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
  },
}))
