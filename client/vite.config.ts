import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 前端开发服务器，代理 /api 与 /uploads 到后端
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
});
