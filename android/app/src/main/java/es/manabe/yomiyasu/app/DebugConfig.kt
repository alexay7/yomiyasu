package es.manabe.yomiyasu.app

import android.content.Intent
import es.manabe.yomiyasu.BuildConfig

/**
 * Configuración de ejecución. En Release los valores apuntan al servidor de producción;
 * en Debug se pueden sobreescribir con extras del Intent (`adb shell am start ... --es
 * YOMIYASU_SERVER_URL http://localhost:3001`) o con propiedades de Gradle
 * (`-Pyomiyasu.serverUrl=...`), igual que las variables de entorno del iOS.
 */
object DebugConfig {

    var serverUrl: String = BuildConfig.SERVER_URL
    var socketUrl: String = BuildConfig.SOCKET_URL

    var autoLoginUser: String? = null
    var autoLoginPassword: String? = null

    var e2eBook: String? = null
    var e2eSerie: String? = null
    var e2ePage: Int? = null
    var e2eCharacters: Int? = null
    var e2eNoSave: Boolean = false
    var e2eSection: String? = null

    fun applyIntentExtras(intent: Intent?) {
        if (!BuildConfig.DEBUG) return

        reset()

        if (intent == null) return

        intent.getStringExtra("YOMIYASU_SERVER_URL")?.let { serverUrl = it }
        intent.getStringExtra("YOMIYASU_SOCKET_URL")?.let { socketUrl = it }
        intent.getStringExtra("YOMIYASU_E2E_USER")?.let { autoLoginUser = it }
        intent.getStringExtra("YOMIYASU_E2E_PASSWORD")?.let { autoLoginPassword = it }
        intent.getStringExtra("YOMIYASU_E2E_BOOK")?.let { e2eBook = it }
        intent.getStringExtra("YOMIYASU_E2E_SERIE")?.let { e2eSerie = it }
        intent.getStringExtra("YOMIYASU_E2E_PAGE")?.toIntOrNull()?.let { e2ePage = it }
        intent.getStringExtra("YOMIYASU_E2E_CHARACTERS")?.toIntOrNull()?.let { e2eCharacters = it }
        intent.getStringExtra("YOMIYASU_E2E_NO_SAVE")?.let { e2eNoSave = it == "1" || it == "true" }
        intent.getStringExtra("YOMIYASU_E2E_SECTION")?.let { e2eSection = it }
    }

    private fun reset() {
        serverUrl = BuildConfig.SERVER_URL
        socketUrl = BuildConfig.SOCKET_URL
        autoLoginUser = null
        autoLoginPassword = null
        e2eBook = null
        e2eSerie = null
        e2ePage = null
        e2eCharacters = null
        e2eNoSave = false
        e2eSection = null
    }
}
