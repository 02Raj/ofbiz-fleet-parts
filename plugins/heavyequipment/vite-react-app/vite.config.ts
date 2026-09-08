import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/heavyequipment/vite-react-app/',
  server: {
    proxy: {
      '/heavyequipment/control': {
        target: 'https://localhost:8443',
        secure: false,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../webapp/heavyequipment/vite-react-app',
    emptyOutDir: false,
    manifest: true,
  },
})
