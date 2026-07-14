import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    // 开发模式下把 API 和健康检查请求代理到本地后端，避免浏览器跨域问题。
    // 生产为前后端分离部署：前端静态托管，设置面板配置后端地址（后端需配置 CORS 白名单）。
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/actuator': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
