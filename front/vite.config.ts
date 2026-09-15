import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Al apuntar a un backend remoto (p. ej. producción tras Cloudflare), el
 * hotlink protection bloquea las imágenes estáticas (`/api/static/...`) si el
 * Referer no pertenece al propio sitio, y el lector se queda en negro.
 * Enviar el Referer del target permite desarrollar en localhost sin 403.
 */
function refererFor(target: string): Record<string, string> {
  try {
    return { referer: `${new URL(target).origin}/` }
  } catch {
    return {}
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'YOMIYASU_')

  const apiTarget = env.YOMIYASU_API_TARGET || 'http://localhost:3001'
  const wsTarget = env.YOMIYASU_WS_TARGET || 'http://localhost:3002'

  const proxy = {
    '/api': { target: apiTarget, changeOrigin: true, headers: refererFor(apiTarget) },
    // El lector de novelas (ッツ Ebook Reader) lo sirve el mismo nginx que la API
    '/ebook': { target: apiTarget, changeOrigin: true, headers: refererFor(apiTarget) },
    '/socket.io': { target: wsTarget, ws: true, changeOrigin: true, headers: refererFor(wsTarget) },
  }

  return {
    define: {
      APP_VERSION: JSON.stringify(process.env.npm_package_version),
    },
    plugins: [react(), tailwindcss()],
    server: { proxy },
    preview: { proxy },
    build: {
      rollupOptions: {
        output: {
          // React en su propio chunk: cambia poco entre despliegues y así el
          // resto puede cachearse aparte. El resto de vendors los reparte
          // Vite según los consumidores eager/lazy (agruparlos por librería
          // arrastraría al arranque código que solo usan las rutas lazy).
          manualChunks(id: string) {
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "vendor-react";
          },
        },
      },
    },
  }
})
