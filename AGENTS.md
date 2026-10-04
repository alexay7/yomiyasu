# AGENTS.md

Four independent apps with no monorepo tooling — `back/`, `front/`, `ios/` and `android/` each
have their own build system and must be run separately. Use pnpm everywhere on the web/backend
side (Dockerfiles install pnpm; `back/package-lock.json` is stale — ignore it).

## Layout
- `back/` — NestJS 10 API (REST + socket.io). MongoDB (Mongoose), Redis (cache + Bull queue
  `rescan-library`), JWT auth. Port 3001, global prefix `/api`; websocket gateway port 3002,
  namespace `/ws`.
- `front/` — React 19 + Vite + Tailwind CSS v4 (sistema de diseño propio en `src/ui/`, Radix +
  cmdk + lucide) + React Router 8 + zustand + TanStack Query v5 + socket.io-client. Sin MUI. Todas las
  llamadas a la API usan rutas relativas `/api/...`. El dev/preview server de Vite proxya `/api`,
  `/ebook` (lector de novelas) y `/socket.io` a `http://localhost:3001`/`:3002` por defecto; configura
  `YOMIYASU_API_TARGET` / `YOMIYASU_WS_TARGET` en `front/.env.local` (ver `front/.env.example`)
  para probar contra otro backend. Prod: nginx (`front/deployment/nginx.default.conf`; ref. dev:
  `nginx.dev.conf`).
- `ios/` — native SwiftUI app (iPhone/iPad/iPhone Duo-ready), Swift 6, min iOS 26.
  XcodeGen: `ios/project.yml` generates `Yomiyasu.xcodeproj` (gitignored — run `xcodegen
  generate` after adding/removing files). SPM deps: Readium (epub), SwiftSoup (mokuro HTML),
  SocketIO, Nuke. No hay servidor por defecto: la URL se configura en la app (login y
  Ajustes → Servidor) y se persiste en UserDefaults; el websocket usa la misma URL que la
  API. En DEBUG, `YOMIYASU_SERVER_URL` (p. ej. `http://localhost:3001`) tiene prioridad y
  `YOMIYASU_E2E_USER`/`YOMIYASU_E2E_PASSWORD` (auto-login) se pasan por env vars del esquema o
  `SIMCTL_CHILD_*` con `simctl launch`.
- `android/` — native Kotlin + Jetpack Compose app (móvil/tablet/plegables), min SDK 26,
  compileSdk 37, AGP 9.4 (Kotlin integrado 2.4.10, KSP, Hilt 2.60), Gradle wrapper 9.6.0.
  Deps: Readium Kotlin (EPUB), Jsoup (mokuro HTML), socket.io-client-java, Coil, OkHttp,
  kotlinx.serialization, DataStore, EncryptedSharedPreferences. No hay servidor por defecto:
  la URL se configura en la app (login y Ajustes → Servidor) y se persiste en
  SharedPreferences; el websocket usa la misma URL que la API. En Debug, `-Pyomiyasu.serverUrl`
  y los extras del Intent (`YOMIYASU_SERVER_URL`, `YOMIYASU_E2E_*`) tienen prioridad.
  Ver `android/README.md`.
- Tracked: `back/`, `front/`, `ios/`, `android/`, `docker-compose.example.yml`. Gitignored local
  files: `docker-compose.yml`, `dicts/`, `exterior/`, `cloudflare/`, `scripts/`, `ebook-reader/`,
  `android/local.properties`, `android/keystore.properties`, `android/keystore.jks`.

## Commands
Run from inside `back/` or `front/` (back loads `.env` from CWD).

back:
- `pnpm start:dev` — watch mode
- `pnpm lint` — eslint with `--fix` (auto-modifies files); `pnpm format` — prettier
  (singleQuote, trailingComma all)
- `pnpm build` — nest build (the only typecheck)

front:
- `pnpm dev` — vite on 5173
- `pnpm lint` — zero-warnings policy (`--max-warnings 0`)
- `pnpm build` — `tsc && vite build` (tsc is the typecheck)

ios (from `ios/`):
- `xcodegen generate` — regenerate the Xcode project
- Build/test need `DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer` (xcode-select
  points at CommandLineTools):
  `DEVELOPER_DIR=... xcodebuild -project Yomiyasu.xcodeproj -scheme Yomiyasu -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath DerivedData test`
- XCTest unit tests live in `YomiyasuTests/` (URLProtocol stubs, Keychain, SessionStore);
  XCUITest live in `YomiyasuUITests/` and read credentials from `LocalFixtures/e2e.json`
  (gitignored; skipped when missing).
- See `ios/README.md` for signing, DEBUG env overrides (`YOMIYASU_SERVER_URL`,
  `YOMIYASU_E2E_*`) and the project layout.

android (from `android/`, con `JAVA_HOME=$(/usr/libexec/java_home -v 21)`; JDK 26 no vale
para AGP):
- `./gradlew :app:assembleDebug` — build de depuración (también sirve de typecheck)
- `./gradlew :app:lint` — Android Lint (`abortOnError`)
- `./gradlew :app:testDebugUnitTest` — tests unitarios JVM (99 tests: parser mokuro,
  hit-testing tategaki, spreads, progreso de novela, DTOs, APIClient/SessionStore/ProgressApi
  con MockWebServer, ServerConfig)
- `./gradlew :app:connectedDebugAndroidTest` — E2E de instrumentación; URL y credenciales por
  `-Pandroid.testInstrumentationRunnerArguments.YOMIYASU_*` (si faltan credenciales, se saltan)
- `./gradlew :app:assembleRelease` — APK firmado (`android/keystore.properties`)
- CI: `.github/workflows/android-apk.yml` compila y publica los APKs (y
  `.github/workflows/ios-ipa.yml` el IPA) en el release rodante `latest` con nombres estables
  (`Yomiyasu-android-release.apk`, `Yomiyasu-android-debug.apk`, `Yomiyasu-ios.ipa`)

No tests exist on the web side (jest is configured in back/ but there are zero spec files).
Verify with lint + build on both web apps; build + test on ios; build + lint + unit tests on
android.

## Runtime prerequisites
- `back/.env` (gitignored) requires `ACCESS_SECRET`, `REFRESH_SECRET`, `MONGOURL`,
  `REDIS_HOST`. Defaults point at Docker hostnames — for local dev use
  `REDIS_HOST=127.0.0.1` + a reachable `MONGOURL` (this machine currently points at a remote
  Mongo `192.168.1.136:27018/yomiyasu`; Redis runs locally on 6379).
- `back/.env` opcionales: `ACCESS_EXPIRES` (def. `30d`) y `REFRESH_EXPIRES` (def. `3650d`,
  10 años) controlan la vida de los JWT y de sus cookies. Con access de 30d, logout y cambio
  de contraseña no revocan el access ya emitido (el refresh sí se revoca en Mongo).
- OCR de caracteres para tomos `format:"images"` (manga sin mokuro): `tesseract.js` con los
  traineddata offline `@tesseract.js-data/jpn` + `jpn_vert` (se copian a `$TMPDIR/yomiyasu-tessdata`).
  Se ejecuta en la cola Bull `ocr-book` (concurrency 1) desde `POST /api/books/:id/ocr`
  (admin), guarda `characters`/`pageChars` acumulativo y `ocrStatus`/`ocrProgress` en el libro,
  y avisa por websocket (`BOOK_OCR_PROGRESS`, luego `LIBRARY_UPDATE`). El front muestra el
  botón admin en `CardMenu` solo para tomos de imágenes.
- Backend won't boot without running Redis and MongoDB.
- pnpm 11: native deps build is governed by `back/pnpm-workspace.yaml` (`allowBuilds`);
  `pnpm lint`/`build` auto-verify deps and will rewrite a stale lockfile.
- `dicts/` (repo root, sibling of back/): `frequency.json`, `pitch.json`, `jmdict/`,
  `jmdict-eng-3.5.0.json` — gitignored; dictionary feature fails without them.
- `exterior/` (repo root): book library (`mangas/`, `novelas/`), also served as static files.
  Missing on this machine: rescan jobs log ENOENT and static covers/pages 404 locally.
- Portadas: el rescan genera miniaturas webp de 480px en `exterior/thumbnails/` (sharp,
  idempotente por mtime, también para libros ya existentes). El front pide
  `/api/static/thumbnails/...`; si la miniatura aún no existe, el backend responde con la
  portada original (`back/src/helpers/staticFiles.ts`, sin 404 ni doble petición) y el front
  además cae a la original por si el backend es antiguo (`CoverImage`/`thumbUrl`). Así el
  orden de despliegue back→rescan→front no rompe nada. iOS/Android siguen usando la portada
  original (no conocen las miniaturas).
- `docker-compose.yml` is gitignored with machine-specific paths; `docker-compose.example.yml`
  is the tracked reference.

## Conventions
- User-facing strings and many code comments are Spanish; commit messages are English.

## Android gotchas
- El emulador debe arrancar con `-gpu host`: con SwiftShader el WebView de Readium no pinta
  (avisa «tile memory limits exceeded») y el lector de novelas se ve en negro.
- `MainActivity` extiende `FragmentActivity` (no `ComponentActivity`) porque el lector de
  novelas embebe `EpubNavigatorFragment` de Readium.
- `SessionStore.bootstrap()` usa `Mutex.withLock` (inline): los `return` internos deben ser
  `return@withLock` o saltan el auto-login E2E.
- `ApiClient` no debe enviar body en GET (OkHttp lanza IllegalArgumentException).

## Gotchas
- `ebook-reader` is a dangling gitlink (submodule entry with no `.gitmodules`, dir absent).
  Don't try to init it.
- `back/src/chars.ts` (+ compiled `chars.js`) is a standalone debug script (`pnpm countchars`),
  not part of the API.
