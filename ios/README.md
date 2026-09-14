# Yomiyasu iOS

Aplicación nativa (SwiftUI) para iPhone, iPad e iPhone Duo: biblioteca, lector de manga
(mokuro) y de novelas (EPUB), diccionario japonés y estadísticas, contra la API de Yomiyasu.

## Requisitos

- macOS con Xcode instalado. Este proyecto compila con **Xcode 27 (beta)**:
  `xcode-select` apunta a CommandLineTools, así que las órdenes necesitan
  `DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer`.
- [XcodeGen](https://github.com/yonaskolb/XcodeGen): `brew install xcodegen`.
- El `.xcodeproj` no se versiona: se genera desde `project.yml`.

## Poner en marcha

```sh
cd ios
xcodegen generate
open Yomiyasu.xcodeproj
```

En Xcode: selecciona tu equipo personal en *Signing & Capabilities* (cuenta gratuita
implica re-firma cada 7 días) y ejecuta en un simulador o dispositivo.

Build y tests desde la terminal:

```sh
export DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer

xcodebuild -project Yomiyasu.xcodeproj -scheme Yomiyasu \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -derivedDataPath DerivedData test
```

Los tests unitarios están en `YomiyasuTests/` y los de interfaz (XCUITest) en
`YomiyasuUITests/`. Los de UI necesitan credenciales vía `LocalFixtures/e2e.json`
(ver más abajo); si no existe, se saltan.

## Servidor

Las builds de Release apuntan a `https://manga.manabe.es`. En **DEBUG** se pueden
sobreescribir con variables de entorno (variables de esquema en Xcode o
`SIMCTL_CHILD_*` con `simctl launch`):

| Variable | Uso |
| --- | --- |
| `YOMIYASU_SERVER_URL` | URL base de la API (p. ej. `http://localhost:3001`) |
| `YOMIYASU_SOCKET_URL` | URL del websocket (p. ej. `http://localhost:3002`) |
| `YOMIYASU_E2E_USER` / `YOMIYASU_E2E_PASSWORD` | Auto-login al arrancar (solo tests) |
| `YOMIYASU_E2E_BOOK` / `YOMIYASU_E2E_SERIE` | Abre directamente un libro/serie |
| `YOMIYASU_E2E_PAGE` / `YOMIYASU_E2E_CHARACTERS` | Página/caracteres iniciales |
| `YOMIYASU_E2E_NO_SAVE` | No escribe progreso de lectura (para pruebas) |
| `YOMIYASU_E2E_SECTION` | Sección inicial (biblioteca, lista, palabras…) |

Ejemplo contra un backend local:

```sh
xcrun simctl launch booted es.manabe.yomiyasu \
  SIMCTL_CHILD_YOMIYASU_SERVER_URL=http://localhost:3001 \
  SIMCTL_CHILD_YOMIYASU_SOCKET_URL=http://localhost:3002 \
  SIMCTL_CHILD_YOMIYASU_E2E_USER=usuario \
  SIMCTL_CHILD_YOMIYASU_E2E_PASSWORD=contraseña
```

### Fixtures locales (gitignored)

- `LocalFixtures/e2e.json` — credenciales y datos para los UI tests:
  `{ "user": "...", "password": "...", "book": "id", "novelBook": "id", "serie": "id" }`.
- `LocalFixtures/sample_manga.html` — muestra de mokuro real para el test del parser
  (`testRealProductionFixture`, se salta si no existe).

## Instalar en el iPhone (sideload con SideStore)

La forma cómoda de tener la app en el móvil sin pagar la cuenta de desarrollador: instalar
[SideStore](https://sidestore.io) una vez con un ordenador y luego firmar/renovar la app
desde el propio dispositivo con **LocalDevVPN**.

### 1. Preparar el dispositivo

1. Instala **LocalDevVPN** desde el App Store (`id6755608044`) y conéctalo
   (pide permiso para añadir la configuración VPN; hace falta tener código de bloqueo).
   No corta tu internet: solo abre un túnel local para firmar.
2. Activa **Modo Desarrollador**: Ajustes → Privacidad y seguridad → Modo desarrollador
   (el dispositivo se reinicia).

### 2. Instalar SideStore (solo la primera vez, con ordenador)

1. Con el iPhone conectado por USB, abre [iloader](https://github.com/nab138/iloader/releases)
   en el Mac, inicia sesión con tu Apple ID y elige *Install SideStore (Stable)*.
2. En el iPhone: Ajustes → General → VPN y gestión de dispositivos → confía en tu Apple ID.
3. Abre **LocalDevVPN** y conecta. Abre **SideStore**, inicia sesión con el mismo Apple ID
   y en *My Apps* toca **7 DAYS** junto a SideStore para completar el primer firmado.

### 3. Compilar el IPA y firmarlo

En el Mac, genera un IPA sin firmar (SideStore lo re-firma):

```sh
export DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer

xcodebuild -project Yomiyasu.xcodeproj -scheme Yomiyasu -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath DerivedData \
  CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO build

mkdir -p Payload && cp -R DerivedData/Build/Products/Release-iphoneos/Yomiyasu.app Payload
zip -r Yomiyasu.ipa Payload && rm -rf Payload
```

Pasa el `.ipa` al iPhone (AirDrop, Archivos…) y en **SideStore** toca **+** y selecciónalo.
Con LocalDevVPN conectado, la app se firma e instala al momento. Los builds de Release ya
apuntan a `https://manga.manabe.es`.

### 4. Renovación automática con un Atajo

Las apps firmadas con Apple ID gratuito caducan a los 7 días (y hay un límite de 3 apps).
Para que no se te caiga:

1. En la app **Atajos**, crea un atajo que:
   - abra **LocalDevVPN** y espere ~3 s a que conecte,
   - ejecute la acción **SideStore → Refresh All Apps** (busca «SideStore» en las acciones).
   - Si el refresh falla con «no pareces estar conectado a Wi-Fi/LocalDevVPN» en
     iOS 26.4+, la comunidad añade además **VPN - Super Unlimited Proxy** con un perfil
     IKEv2 antes de LocalDevVPN; con SideStore 0.6.3+ (pairing con iloader) normalmente
     basta con LocalDevVPN.
2. En la pestaña **Automatización**, crea una automatización personal
   (por ejemplo «Cada día a las 2:00» o «Al conectar al cargador») que ejecute ese atajo
   **sin preguntar**. Con eso la firma se renueva sola cada noche.
3. Comprueba cada cierto tiempo en SideStore que quedan días de sobra (el contador
   «7 DAYS»). Si el pairing caduca (tras actualizar/resetear iOS), repite el paso 2
   de iloader.

Alternativa sin Atajos: SideStore moderno trae *background refresh* propio; actívalo en
sus ajustes y deja LocalDevVPN disponible, pero el Atajo es más fiable si iOS lo limita.

## Estructura

```
Yomiyasu/
  App/         Arranque, entorno de dependencias y shell adaptativo (tabs/sidebar)
  Components/  Vistas reutilizables (tarjetas, portadas con auth, pitch accent…)
  Core/
    Models/    DTOs que reflejan la API del backend
    Networking/APIClient con Bearer, refresh automático y errores tipados
    Readers/   Parser mokuro, pager de manga, Readium (EPUB), diccionario, descargas
    Services/  API de biblioteca/diccionario/progreso, sockets, monitor de red
    Settings/  Ajustes persistidos (tema, lectura, biblioteca)
  Features/    Pantallas por área (Auth, Home, Library, Serie, Reader, Novel, …)
  Resources/   Info.plist generado, Assets (icono de la web), fuentes OCR
```

## Notas

- El lector de manga renderiza el HTML mokuro de forma nativa (CoreText con
  tategaki real para texto vertical) y el diccionario se abre tocando una caja OCR
  (tap para mostrar el texto, segundo tap para buscar). Las páginas requieren
  autenticación (Bearer) también para `/api/static`.
- El lector de novelas usa Readium y mapea la posición al contrato de
  `characters` del backend contando caracteres japoneses por capítulo.
- Las descargas viven en `Application Support/Yomiyasu/Downloads` y permiten leer
  sin conexión (sin guardar progreso mientras no hay red).
- Las APIs específicas del iPhone Duo (`ArrangementView`, `ReservedRegion`,
  `onHingeChange`) llegarán con el SDK de Xcode 27.1; el diseño ya es adaptativo
  (compact/regular) así que la app se ajusta sola mientras tanto.
