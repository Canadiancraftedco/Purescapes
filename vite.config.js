import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        // Public-facing site (index.html at root)
        main: resolve(__dirname, 'index.html'),
        // Admin dashboard (admin.html at /admin)
        admin: resolve(__dirname, 'admin.html'),
      }
    },
    outDir: 'dist'
  }
})
