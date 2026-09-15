# Yomiyasu Android

Aplicación nativa (Kotlin + Jetpack Compose) para móvil, tablet y plegables: biblioteca,
lector de manga (mokuro) y de novelas (EPUB), diccionario japonés y estadísticas, contra la
API de Yomiyasu. Paridad funcional con la app iOS (`ios/`).

## Requisitos

- Android Studio (incluye el SDK). El proyecto compila con **compileSdk 37** y AGP 9.4.
- JDK 21 para Gradle (`/usr/libexec/java_home -v 21`). El JDK 26 del sistema puede no ser
  compatible con AGP: usa `JAVA_HOME=$(/usr/libexec/java_home -v 21)`.
- El wrapper (`gradlew`) fija Gradle 9.6.0; no hace falta instalarlo.
- El SDK tiene que incluir `platforms;android-37.0`, `build-tools;36.0.0` o superior,
  `platform-tools` y un emulador (`system-images;android-36;google_apis;arm64-v8a`).
- `local.properties` (gitignored) con `sdk.dir=...` apuntando al SDK.

## Poner en marcha

```sh
cd android
./gradlew :app:installDebug   # o abrir la carpeta android/ en Android Studio
```

Comandos:

- `./gradlew :app:assembleDebug` — APK de depuración.
- `./gradlew :app:lint` — Android Lint (con `abortOnError`).
- `./gradlew :app:testDebugUnitTest` — tests unitarios JVM (parser mokuro, hit-testing
  tategaki, spreads, progreso de novela, DTOs, API con MockWebServer, sesión).
- `./gradlew :app:connectedDebugAndroidTest` — tests E2E de instrumentación (necesitan
  emulador/dispositivo y credenciales, ver abajo).
- `./gradlew :app:assembleRelease` — APK de release firmado.

En esta máquina el emulador se creó con:

```sh
avdmanager create avd -n yomiyasu -k "system-images;android-36;google_apis;arm64-v8a" -d pixel_7
$ANDROID_HOME/emulator/emulator -avd yomiyasu -no-snapshot -no-audio -gpu host
```

> Usa `-gpu host`: con el renderizado por software (SwiftShader) el WebView del lector de
> novelas no dibuja el contenido (avisa «tile memory limits exceeded»).

## Servidor

Las builds de Release apuntan a `https://manga.manabe.es`. En **Debug** se puede sobreescribir:

- Con propiedades de Gradle (se hornean en `BuildConfig`):
  `./gradlew :app:assembleDebug -Pyomiyasu.serverUrl=http://10.0.2.2:3001 -Pyomiyasu.socketUrl=http://10.0.2.2:3002`
- Con extras del Intent al arrancar (`adb shell am start`), equivalente a las variables de
  entorno del iOS:

```sh
adb shell am start -n es.manabe.yomiyasu/.app.MainActivity \
  --es YOMIYASU_SERVER_URL http://10.0.2.2:3001 \
  --es YOMIYASU_SOCKET_URL http://10.0.2.2:3002 \
  --es YOMIYASU_E2E_USER usuario \
  --es YOMIYASU_E2E_PASSWORD contraseña \
  --es YOMIYASU_E2E_BOOK <id> \
  --es YOMIYASU_E2E_PAGE 30 \
  --es YOMIYASU_E2E_NO_SAVE 1
```

Variables E2E soportadas (solo Debug): `YOMIYASU_SERVER_URL`, `YOMIYASU_SOCKET_URL`,
`YOMIYASU_E2E_USER`, `YOMIYASU_E2E_PASSWORD`, `YOMIYASU_E2E_BOOK`, `YOMIYASU_E2E_SERIE`,
`YOMIYASU_E2E_PAGE`, `YOMIYASU_E2E_CHARACTERS`, `YOMIYASU_E2E_NO_SAVE`, `YOMIYASU_E2E_SECTION`
(`inicio`, `biblioteca`, `lista`, `palabras`, `mas`).

### Tests E2E

Los tests leen las credenciales de argumentos de instrumentación; sin ellos se saltan. Se
pueden tomar del mismo `ios/LocalFixtures/e2e.json`:

```sh
./gradlew :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.YOMIYASU_E2E_USER=usuario \
  -Pandroid.testInstrumentationRunnerArguments.YOMIYASU_E2E_PASSWORD=contraseña \
  -Pandroid.testInstrumentationRunnerArguments.YOMIYASU_E2E_BOOK=<id> \
  -Pandroid.testInstrumentationRunnerArguments.YOMIYASU_E2E_NOVEL=<id> \
  -Pandroid.testInstrumentationRunnerArguments.YOMIYASU_E2E_SERIE=<id>
```

## Instalar el APK de release

1. El keystore de firma vive en `android/keystore.jks` con sus credenciales en
   `android/keystore.properties` (ambos gitignored; si no existe, Release se firma con la
   clave de debug). Para regenerarlos:

   ```sh
   keytool -genkeypair -v -keystore keystore.jks -alias yomiyasu \
     -keyalg RSA -keysize 4096 -validity 10000
   ```

2. Compilar e instalar:

   ```sh
   ./gradlew :app:assembleRelease
   adb install -r app/build/outputs/apk/release/app-release.apk
   ```

   O copiar el APK al móvil e instalarlo manualmente (permitiendo orígenes desconocidos).

## CI y releases

`.github/workflows/android-apk.yml` compila los APKs en cada push que toque `android/` y
publica el release rodante **`latest`** con nombres estables (los tests y el lint se ejecutan
en local, no en CI):

- `https://github.com/alexay7/yomiyasu/releases/latest/download/Yomiyasu-android-release.apk`
- `https://github.com/alexay7/yomiyasu/releases/latest/download/Yomiyasu-android-debug.apk`

(El workflow de iOS publica el IPA en el mismo release como `Yomiyasu-ios.ipa`.)

El `versionCode`/`versionName` de la CI vienen del número de ejecución
(`-Pyomiyasu.versionCode/-Pyomiyasu.versionName`), así las actualizaciones no se bloquean.

Para que el APK de release vaya firmado con tu keystore (y puedas actualizar encima de la
app instalada), configura estos secrets en el repositorio (Settings → Secrets and variables →
Actions):

| Secret | Valor |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -i android/keystore.jks \| pbcopy` (una sola línea) |
| `ANDROID_KEYSTORE_PASSWORD` | `storePassword` de `keystore.properties` |
| `ANDROID_KEY_ALIAS` | `keyAlias` (por defecto `yomiyasu`) |
| `ANDROID_KEY_PASSWORD` | `keyPassword` de `keystore.properties` |

Sin estos secrets el workflow sigue funcionando, pero el APK de release va firmado con la
clave de debug (no permitirá actualizar sobre una instalación firmada con tu keystore).

## Estructura

```
app/src/main/java/es/manabe/yomiyasu/
  app/          MainActivity (FragmentActivity), shell adaptativo (barra inferior/sidebar),
                tema Material 3, rutas, DebugConfig
  components/   BookCard, SerieCard, RemoteImage, PitchAccentView, RatingViews, estado…
  core/
    models/     DTOs kotlinx.serialization (tolerantes: readlist bool/objeto, CurrentBook…)
    networking/ ApiClient (OkHttp) con refresh automático en 401, Endpoint, ApiException
    mokuro/     Parser Jsoup del HTML de mokuro
    readers/    Spreads, TategakiLayout (disposición + hit-testing), Readium, progreso de
                novela, cronómetro, espejo de progreso
    services/   LibraryApi, ProgressApi, DictionaryApi, AccountApi, DownloadManager,
                LibraryActions, SocketService (/ws), NetworkMonitor, StaticUrls
    session/    SessionStore + SecureTokenStore (EncryptedSharedPreferences)
    settings/   AppSettings y ReaderSettings (DataStore)
  features/     auth, home, library, readlist, serie, reader (manga + diccionario),
                novel (Readium), words, history, stats, downloads, settings, more
```

## Notas

- El lector de manga pinta el HTML de mokuro de forma nativa: las cajas OCR se dibujan en un
  `Canvas` de Compose con texto vertical real (columnas derecha→izquierda, métricas de mokuro
  de 1.1 em) y el hit-testing reproduce el de CoreText (`TategakiLayout`).
- El lector de novelas usa el Readium Kotlin toolkit (`EpubNavigatorFragment`) embebido en
  Compose; la selección de texto añade la acción «Buscar en Yomiyasu». El progreso se mapea a
  `characters` contando caracteres japoneses por capítulo.
- Las descargas viven en `filesDir/Yomiyasu/Downloads` con un `manifest.json` y permiten leer
  sin conexión (sin guardar progreso mientras no hay red).
- Las páginas y portadas requieren `Authorization: Bearer`; Coil usa un cliente OkHttp con
  interceptor que lo inyecta.
