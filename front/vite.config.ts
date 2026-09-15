import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'YOMIYASU_')

  const apiTarget = env.YOMIYASU_API_TARGET || 'http://localhost:3001'
  const wsTarget = env.YOMIYASU_WS_TARGET || 'http://localhost:3002'

  return {
    define: {
      APP_VERSION: JSON.stringify(process.env.npm_package_version),
    },
    plugins: [react()],
    server: {
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/socket.io': { target: wsTarget, ws: true, changeOrigin: true },
      },
    },
  }
})
