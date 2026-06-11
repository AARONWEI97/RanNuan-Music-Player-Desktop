import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
      // ★ shared/src/ 下的 bare import（如 axios、zustand）因为 shared/node_modules
      //    已被删除，Node 模块解析链上找不到这些包。这里显式指向 desktop/node_modules
      axios: path.resolve(__dirname, 'node_modules/axios'),
      zustand: path.resolve(__dirname, 'node_modules/zustand'),
      'zustand/middleware': path.resolve(__dirname, 'node_modules/zustand/middleware'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
