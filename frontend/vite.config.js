import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev rejimda /api so'rovlari FastAPI'ga (8000-port) yo'naltiriladi
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': `http://127.0.0.1:${process.env.GOYA_API_PORT || 8020}` },
  },
  define: { 'process.env.IS_PREACT': JSON.stringify('false') },
})
