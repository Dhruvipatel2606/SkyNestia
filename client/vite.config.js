import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:5001',
      '/user': 'http://localhost:5001',
      '/post': 'http://localhost:5001',
      '/comment': 'http://localhost:5001',
      '/api': 'http://localhost:5001',
      '/images': 'http://localhost:5001'
    }
  }
})

