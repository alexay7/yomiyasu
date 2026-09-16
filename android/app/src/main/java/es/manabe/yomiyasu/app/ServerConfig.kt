package es.manabe.yomiyasu.app

import android.content.Context
import android.content.Intent
import es.manabe.yomiyasu.BuildConfig
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull

/**
 * URL del servidor elegida por el usuario. No hay valor por defecto: sin
 * servidor no se puede iniciar sesión y el campo «Servidor» es obligatorio
 * en el login.
 *
 * Orden de resolución: extras del Intent (solo DEBUG, para E2E), URL
 * persistida por el usuario y, por último, `BuildConfig.SERVER_URL` (solo en
 * Debug puede hornearse con `-Pyomiyasu.serverUrl=...`). El websocket usa
 * siempre la misma URL que la API.
 */
object ServerConfig {

    private const val PREFS_NAME = "yomiyasu_server"
    private const val PREF_SERVER_URL = "server_url"

    var serverUrl: HttpUrl? = null
        private set

    var autoLoginUser: String? = null
        private set
    var autoLoginPassword: String? = null
        private set

    var e2eBook: String? = null
        private set
    var e2eSerie: String? = null
        private set
    var e2ePage: Int? = null
        private set
    var e2eCharacters: Int? = null
        private set
    var e2eNoSave: Boolean = false
        private set
    var e2eSection: String? = null
        private set

    val isConfigured: Boolean get() = serverUrl != null

    /** Carga la URL persistida; `BuildConfig.SERVER_URL` actúa de fallback en Debug. */
    fun loadPersisted(context: Context) {
        val persisted = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(PREF_SERVER_URL, null)
        serverUrl = resolve(persisted)
    }

    /** Persiste y aplica una nueva URL. Devuelve `null` si no es válida. */
    fun setServerUrl(raw: String, context: Context): HttpUrl? {
        val url = parse(raw) ?: return null

        serverUrl = url
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(PREF_SERVER_URL, url.toString())
            .apply()
        return url
    }

    fun applyIntentExtras(intent: Intent?) {
        if (!BuildConfig.DEBUG) return

        applyExtras { key -> intent?.getStringExtra(key) }
    }

    internal fun applyExtras(read: (String) -> String?) {
        read("YOMIYASU_SERVER_URL")?.let { raw ->
            parse(raw)?.let { serverUrl = it }
        }

        read("YOMIYASU_E2E_USER")?.let { autoLoginUser = it }
        read("YOMIYASU_E2E_PASSWORD")?.let { autoLoginPassword = it }
        read("YOMIYASU_E2E_BOOK")?.let { e2eBook = it }
        read("YOMIYASU_E2E_SERIE")?.let { e2eSerie = it }
        read("YOMIYASU_E2E_PAGE")?.toIntOrNull()?.let { e2ePage = it }
        read("YOMIYASU_E2E_CHARACTERS")?.toIntOrNull()?.let { e2eCharacters = it }
        read("YOMIYASU_E2E_NO_SAVE")?.let { e2eNoSave = it == "1" || it == "true" }
        read("YOMIYASU_E2E_SECTION")?.let { e2eSection = it }
    }

    /** Valida y normaliza la URL: admite `host[:puerto]` sin esquema (https) y descarta path, query y fragmento. */
    fun parse(raw: String): HttpUrl? {
        val trimmed = raw.trim()
        if (trimmed.isEmpty() || trimmed.any { it.isWhitespace() }) return null

        val withScheme = if (trimmed.contains("://")) trimmed else "https://$trimmed"
        val url = withScheme.toHttpUrlOrNull() ?: return null

        return url.newBuilder()
            .encodedPath("/")
            .query(null)
            .fragment(null)
            .build()
    }

    internal fun resolve(persisted: String?): HttpUrl? =
        parse(persisted ?: BuildConfig.SERVER_URL)

    /** Deja el objeto limpio; pensado para los tests unitarios. */
    fun reset() {
        serverUrl = null
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
