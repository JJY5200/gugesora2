import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 部署到 GitHub Pages 子目录，设置为仓库名称
  base: '/gugesora2/',
  server: {
    host: true
  }
})