import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 设置为相对路径，确保在任何目录下都能正常工作
  base: './',
  server: {
    host: true
  }
})