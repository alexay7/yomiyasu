# Yomiyasu

Yomiyasu es un **servidor personal de lectura en japonés**: monta tu propia biblioteca de manga y novelas ligeras con progreso de lectura sincronizado, estadísticas, diccionario integrado y apps nativas para iOS y Android.

- 📖 **Manga**: lectura de tomos procesados con [mokuro](https://github.com/kha-white/mokuro) (doble página, zoom, recortes de burbujas)
- 📚 **Novelas ligeras**: lector de EPUB con progreso sincronizado entre dispositivos vía websocket
- 📈 **Progreso y estadísticas**: histórico de lectura, calendario, rachas y gráficas
- 🈳 **Diccionario integrado**: JMdict con frecuencias y acentos tonales (pitch accent)
- 👥 **Multiusuario**: cuentas con permisos, códigos de invitación y panel de administración
- 📱 **Apps nativas**: iOS (SwiftUI) y Android (Jetpack Compose)

> [!IMPORTANT]
> ## Contenido adquirido legalmente
>
> Yomiyasu **no incluye, distribuye ni descarga libros**. Es un servidor para leer tu propia biblioteca desde tus propios dispositivos, como alternativa a un lector local.
>
> **Solo debes subir a tu servidor contenido que hayas adquirido legalmente** (copias físicas o digitales con licencia). Reproducir, compartir o redistribuir obras protegidas sin autorización es responsabilidad exclusiva de quien lo haga, y va contra el propósito de este proyecto. No compartas el acceso a tu instancia con personas a las que no quieras dar acceso a tu biblioteca personal.

## Requisitos

- Una máquina (VPS, mini-PC, NAS…) con **Docker** y **Docker Compose v2** (`docker compose ...`)
- Tu biblioteca de manga en formato mokuro y/o novelas en EPUB
- Opcional: diccionarios para el módulo de palabras (ver paso 3)

## Despliegue con Docker

Todo el stack (API, base de datos, caché, frontend y lector de novelas) se levanta con un único `docker-compose`, usando las imágenes publicadas en Docker Hub. No hace falta compilar nada.

### 1. Descarga el compose de ejemplo

```bash
curl -O https://raw.githubusercontent.com/alexay7/yomiyasu/main/docker-compose.example.yml
# o simplemente clona el repositorio:
# git clone https://github.com/alexay7/yomiyasu
```

### 2. Prepara tu biblioteca

Crea una carpeta (p. ej. `biblioteca`) con esta estructura:

```
biblioteca/
├── mangas/
│   ├── Mi Serie A/
│   │   ├── Tomo 01.html        ← salida de mokuro
│   │   ├── Tomo 01_files/      ← imágenes del tomo (al lado del .html)
│   │   └── ...
│   └── Mi Serie B/
│       └── ...
└── novelas/
    └── Mi Serie C/
        ├── Volumen 01.epub
        └── ...
```

- **Manga**: una carpeta por serie dentro de `mangas/`, con un `.html` de mokuro por tomo (y sus imágenes) directamente dentro de la carpeta de la serie.
- **Novelas**: una carpeta por serie dentro de `novelas/`, con un `.epub` por volumen.

El nombre de las carpetas de serie será el nombre visible en la web (puedes editarlo después desde la propia interfaz).

### 3. (Opcional) Diccionarios para el módulo de palabras

Si quieres el buscador de palabras con frecuencias y pitch accent, crea una carpeta `dicts` con:

```
dicts/
├── jmdict-eng-3.5.0.json   ← JMdict en JSON
├── frequency.json
├── pitch.json
└── jmdict/                 ← la genera el backend al arrancar; puede estar vacía
```

- `jmdict-eng-3.5.0.json`: descárgalo de las [releases de jmdict-simplified](https://github.com/scriptedformulas/jmdict-simplified/releases) (datos de [JMdict/EDRDG](https://www.edrdg.org/jmdict/edict.html), licencia CC BY-SA).
- `frequency.json` y `pitch.json`: se pueden obtener a partir de diccionarios compatibles con [Yomitan](https://github.com/yomidevs/yomitan) (listas de frecuencia y pitch accent), convertidos al formato JSON plano que espera el backend (la forma exacta está en `back/src/dictionary/dictionary.service.ts`).

Sin estos archivos el servidor arranca y funciona con normalidad; solo el módulo de palabras dejará de responder.

### 4. Configura el compose

Abre `docker-compose.example.yml` con un editor. Solo hay que tocar **el puerto**, **los secretos** y **las rutas de tu biblioteca y tus diccionarios**. El resto puede quedarse tal cual.

#### Puerto de la web

```yaml
  client:
    ports:
      - "PORT:80"
```

`PORT` es el puerto de tu máquina por el que se publicará la web (el `80` de la derecha es el del contenedor y no se toca). Si lo cambias a `"8080:80"`, la web quedará en `http://TU-IP:8080`. Elige un puerto libre; si vas a poner delante un proxy inverso con HTTPS (ver más abajo), este es el puerto al que debe apuntar.

#### Secretos del backend

```yaml
    environment:
      - ACCESS_SECRET=valor_del_access_secret
      - REFRESH_SECRET=valor_del_refresh_secret
```

Son dos cadenas aleatorias con las que el backend firma los tokens de sesión. Sustituye cada texto por una cadena larga y difícil de adivinar, por ejemplo la salida de:

```bash
openssl rand -hex 32
```

No hace falta que sean iguales en todos los servidores. Si las cambias con el servidor ya en marcha, todos los usuarios tendrán que volver a iniciar sesión.

#### Rutas de las carpetas (volúmenes)

El compose conecta carpetas de tu máquina con carpetas internas de los contenedores. Cada `source` debe ser una ruta **absoluta** (empezando por `/`; no valen rutas relativas ni `~`) y las rutas `target` no se cambian:

```yaml
    volumes:
      - type: bind
        source: /folder/with/book/library   # ← cámbialo
        target: /usr/src/exterior           # ← déjalo igual
      - type: bind
        source: /config/folder/dicts        # ← cámbialo
        target: /usr/src/dicts              # ← déjalo igual
```

| `source` en el ejemplo | Cámbialo por | `target` (no tocar) |
| --- | --- | --- |
| `/folder/with/book/library` | La ruta de tu carpeta `biblioteca` (la del paso 2, con `mangas/` y `novelas/` dentro) | `/usr/src/exterior` |
| `/config/folder/dicts` | La ruta de tu carpeta `dicts` (la del paso 3; si no vas a usar diccionarios, cualquier carpeta vacía) | `/usr/src/dicts` |

La base de datos (`mongodb`) es la excepción: no usa una carpeta del host, sino un **volumen gestionado por Docker** (`mongo`), así que no hay que preparar nada. Los datos (usuarios, progreso de lectura, estadísticas…) sobreviven a `docker compose down` y a rehacer los contenedores. Para hacer una copia de seguridad:

```bash
docker compose exec mongodb mongodump --archive --gzip > copia-yomiyasu.gz
```

#### Valores que no hay que tocar

```yaml
      - REDIS_HOST=cache
      - MONGOURL=mongodb://mongodb:27017/yomiyasu
```

`cache` y `mongodb` no son ajustes: son los nombres de los propios servicios dentro de la red interna de Docker. El backend los usa para encontrarlos y funcionan así en cualquier máquina.

#### Ejemplo final

Así quedarían esas secciones si tu biblioteca está en `/home/usuario/yomiyasu/biblioteca`, los diccionarios en `/home/usuario/yomiyasu/dicts` y publicas la web en el puerto `8080`:

```yaml
  api:
    environment:
      - ACCESS_SECRET=a3f1c8…   # tu salida de openssl rand -hex 32
      - REFRESH_SECRET=91be07…  # otra salida distinta
      - REDIS_HOST=cache
      - MONGOURL=mongodb://mongodb:27017/yomiyasu
    volumes:
      - type: bind
        source: /home/usuario/yomiyasu/biblioteca
        target: /usr/src/exterior
      - type: bind
        source: /home/usuario/yomiyasu/dicts
        target: /usr/src/dicts
  client:
    ports:
      - "8080:80"
```

El servicio `mongodb` no aparece porque no hay que cambiarle nada: ya usa su volumen `mongo`.

> [!TIP]
> El compose publica los puertos `6379` (Redis) y `27018` (MongoDB) en el host. En un servidor público, elimina esos `ports` o protégelos con firewall: solo los necesita quien quiera inspeccionar la base de datos desde fuera.

### 5. Arranca el stack

Desde la carpeta donde tengas el compose (renómbralo antes a `docker-compose.yml` si quieres usar el comando sin `-f`):

```bash
docker compose up -d
```

La web estará disponible en `http://TU-IP:PUERTO`, usando el puerto que hayas elegido en el paso 4 (por ejemplo `http://192.168.1.50:8080`).

### 6. Crea el primer usuario (administrador)

En la pantalla de login, pulsa **«¿Tienes un código de invitación?»** y crea tu cuenta.

Como es el primer usuario del servidor, **no se te pedirá código** y la cuenta se creará automáticamente como **administrador**. Ese campo solo aparece (y solo se valida) a partir del segundo usuario.

### 7. Escanea la biblioteca

Entra con tu cuenta, ve a **Biblioteca** y pulsa el botón **«Reescanear biblioteca»** (hay que hacerlo tanto para manga como para novelas con el selector de la izquierda). El escaneo encola un job que registra todas las series y tomos encontrados y genera las miniaturas de portada; la primera vez puede tardar un poco según el tamaño de tu biblioteca.

Después de añadir o quitar archivos, vuelve a pulsarlo: los cambios se detectan de forma incremental (las series que desaparezcan se marcan como «missing» y se pueden borrar o restaurar desde el panel de administración).

## Exponerlo con HTTPS (proxy inverso)

El contenedor `client` sirve todo por HTTP en un puerto; para publicarlo en internet con HTTPS, pon un proxy inverso delante que apunte a ese puerto. El único requisito especial es que **debe soportar WebSockets** (la ruta `/socket.io` lleva el progreso de lectura en tiempo real).

**Caddy** (los certificados son automáticos):

```caddyfile
manga.tudominio.com {
    reverse_proxy 127.0.0.1:8080
}
```

**nginx** (equivalente):

```nginx
server {
    listen 443 ssl;
    server_name manga.tudominio.com;
    # ssl_certificate ... ; ssl_certificate_key ... ;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600;   # sesiones de lectura largas
    }
}
```

El frontend de Yomiyasu ya manda `X-Robots-Tag: noindex`, así que tu instancia no aparecerá en buscadores.

## Más usuarios y códigos de invitación

- **Directo**: un administrador puede crear cuentas desde el panel de administración (botón «Nuevo usuario»).
- **Auto-registro**: genera un código de invitación llamando a `POST /api/invis` autenticado como administrador (p. ej. con `curl` usando la cookie `access_token` de tu sesión). Quien reciba el código podrá crear su cuenta en `/coderedeem`.

## Apps móviles (iOS / Android)

Las apps del [release `latest`](https://github.com/alexay7/yomiyasu/releases) apuntan al servidor del autor, así que para usar el tuyo tienes que compilarlas apuntándole a tu URL (modo debug):

- iOS: variable `YOMIYASU_SERVER_URL` — ver `ios/README.md`
- Android: `-Pyomiyasu.serverUrl` o extras del Intent — ver `android/README.md`

Ambas apps reutilizan las mismas credenciales y sincronizan el progreso con la web.

## Solución de problemas

| Problema | Causa probable |
| --- | --- |
| El contenedor `client` no arranca (`host not found in upstream "ebook"`) | Falta el servicio `ebook` en el compose (el nginx del frontend lo necesita) |
| El rescan registra series pero las imágenes/portadas dan 404 / errores ENOENT | Volúmenes mal configurados: las `source` deben ser rutas absolutas del host y apuntar a tu carpeta `biblioteca` |
| El módulo de palabras responde «Dictionary is being loaded into the cache» | El índice de JMdict se está construyendo al arrancar; espera y reintenta |
| El módulo de palabras falla siempre | Falta o está mal algún archivo de `dicts/` |
| Las portadas tardan en aparecer la primera vez | Las miniaturas se generan durante el rescan; la web muestra la portada original mientras tanto |
| Puerto ya en uso | Cambia el puerto publicado de `client` (`"PUERTO:80"`) |
| `mongodb` se reinicia en bucle (`Illegal instruction` en sus logs) | La CPU no soporta AVX (necesario desde MongoDB 5.0): usa otra máquina o fija `image: mongo:4.4` bajo tu cuenta y riesgo (versión sin soporte) |

## Desarrollo y licencia

El proyecto está dividido en cuatro apps independientes (`back/`, `front/`, `ios/`, `android/`) sin tooling de monorepo. Las imágenes de Docker se construyen con los `Dockerfile` de `back/` y `front/` si quieres desplegar tus propias modificaciones.

Licencia: [GPL-3.0](LICENSE).
