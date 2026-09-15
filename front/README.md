# Yomiyasu Front

Frontend web (React 18 + Vite + MUI + Tailwind + zustand + react-query + socket.io-client)
contra la API de Yomiyasu.

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
