# Yomiyasu Front

Frontend web (React 19 + Vite + Tailwind CSS v4 + React Router 8 + zustand + TanStack
Query v5 + socket.io-client) contra la API de Yomiyasu.

El sistema de diseño propio vive en `src/ui/` (primitivas sobre Radix + Tailwind) con los
tokens en `src/index.css` (`@theme`). Puede desplegarse con preflight de Tailwind sin
dependencias de UI externas.

## Desarrollo

```sh
pnpm install
pnpm dev       # servidor de desarrollo en http://localhost:5173
pnpm build     # tsc && vite build (hace de typecheck)
pnpm lint      # eslint con --max-warnings 0
pnpm preview   # sirve dist/ en el puerto 5173
```

Todas las llamadas usan rutas relativas (`/api/...`, `/socket.io`), así que el navegador
habla siempre con el mismo origen y las cookies httpOnly de autenticación funcionan sin
problemas. Es el servidor de Vite el que hace de proxy hacia el backend.

## Apuntar a otro backend

Por defecto el proxy apunta al backend local (`http://localhost:3001` para la API y
`http://localhost:3002` para el websocket). Para usar otro backend de pruebas, copia
`.env.example` a `.env.local` y ajusta:

```sh
# Backend en otra máquina de la red
YOMIYASU_API_TARGET=http://192.168.1.50:3001
YOMIYASU_WS_TARGET=http://192.168.1.50:3002

# Servidor desplegado (nginx enruta /socket.io al puerto 3002)
YOMIYASU_API_TARGET=https://manga.manabe.es
YOMIYASU_WS_TARGET=https://manga.manabe.es
```

Reinicia `pnpm dev` tras cambiar los valores. `pnpm preview` hereda la misma configuración
de proxy.

## Portadas

`CoverImage` (`src/components/CoverImage.tsx`) pide primero la miniatura webp de 480px que el
backend genera en `exterior/thumbnails/` durante el rescan (`thumbUrl()` en `src/lib/media.ts`)
y cae automáticamente a la portada original si todavía no existe (404). Por eso el front puede
desplegarse antes que el backend + rescan sin romper ninguna imagen.
