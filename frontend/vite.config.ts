import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Get backend port from environment or use default
const backendPort = process.env.BACKEND_PORT ?? '8080'
const backendUrl = `http://localhost:${backendPort}`

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
})