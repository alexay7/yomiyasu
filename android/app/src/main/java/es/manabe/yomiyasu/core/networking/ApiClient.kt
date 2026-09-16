package es.manabe.yomiyasu.core.networking

import es.manabe.yomiyasu.app.ServerConfig
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.DeserializationStrategy
import kotlinx.serialization.json.Json
import okhttp3.HttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response

/**
 * Cliente HTTP. Con `baseUrl` explícita (tests) usa siempre esa; sin ella
 * resuelve la URL configurada por el usuario en cada petición, de modo que un
 * cambio de servidor surte efecto sin reconstruir la app.
 */
class ApiClient(
    private val baseUrl: HttpUrl? = null,
    private val client: OkHttpClient,
    val json: Json = YomiyasuJson,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) {
    val activeBaseUrl: HttpUrl?
        get() = baseUrl ?: ServerConfig.serverUrl

    interface AuthTokenProvider {
        val accessToken: String?
        suspend fun refreshTokens()
    }

    @Volatile
    var authProvider: AuthTokenProvider? = null

    suspend fun <T> send(
        endpoint: Endpoint,
        deserializer: DeserializationStrategy<T>,
        authorized: Boolean = true,
        allowRefresh: Boolean = true,
    ): T {
        val data = request(endpoint, authorized = authorized, allowRefresh = allowRefresh)

        return try {
            json.decodeFromString(deserializer, data.decodeToString())
        } catch (error: Exception) {
            if (error is ApiException) throw error
            throw ApiException.Decoding(error)
        }
    }

    suspend fun send(
        endpoint: Endpoint,
        authorized: Boolean = true,
        allowRefresh: Boolean = true,
    ) {
        request(endpoint, authorized = authorized, allowRefresh = allowRefresh)
    }

    suspend fun sendBytes(
        endpoint: Endpoint,
        authorized: Boolean = true,
        allowRefresh: Boolean = true,
    ): ByteArray = request(endpoint, authorized = authorized, allowRefresh = allowRefresh)

    private suspend fun request(
        endpoint: Endpoint,
        authorized: Boolean,
        allowRefresh: Boolean,
    ): ByteArray {
        val response = execute(endpoint, authorized)

        if (response.isSuccessful) {
            return response.use { it.body?.bytes() ?: ByteArray(0) }
        }

        val bodyText = response.use { it.body?.string() }
        val envelope = bodyText
            ?.takeIf { it.isNotBlank() }
            ?.let { runCatching { json.decodeFromString<ErrorEnvelope>(it) }.getOrNull() }

        if (response.code == 401 && authorized && allowRefresh) {
            val provider = authProvider ?: throw ApiException.Http(response.code, envelope)
            provider.refreshTokens()
            return request(endpoint, authorized = true, allowRefresh = false)
        }

        throw ApiException.Http(response.code, envelope)
    }

    private suspend fun execute(endpoint: Endpoint, authorized: Boolean): Response {
        val currentBaseUrl = activeBaseUrl ?: throw ApiException.ServerNotConfigured()
        val url = ServerUrls.buildUrl(currentBaseUrl, endpoint.path, endpoint.query)

        val requestBuilder = Request.Builder()
            .url(url)
            .header("Accept", "application/json")

        endpoint.headers.forEach { (name, value) -> requestBuilder.header(name, value) }

        if (authorized) {
            authProvider?.accessToken?.let { token ->
                requestBuilder.header("Authorization", "Bearer $token")
            }
        }

        val emptyBody = ByteArray(0).toRequestBody("application/json".toMediaType())
        val jsonBody = endpoint.body?.let { ServerUrls.jsonRequestBody(it, json) }

        when (endpoint.method) {
            HttpMethod.GET -> requestBuilder.get()
            HttpMethod.DELETE -> requestBuilder.delete()
            else -> requestBuilder.method(endpoint.method.name, jsonBody ?: emptyBody)
        }

        val request = requestBuilder.build()

        return withContext(ioDispatcher) {
            try {
                client.newCall(request).execute()
            } catch (error: Exception) {
                throw ApiException.Transport(error)
            }
        }
    }
}
