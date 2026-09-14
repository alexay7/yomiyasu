package es.manabe.yomiyasu.core.networking

import kotlinx.serialization.SerializationStrategy
import kotlinx.serialization.serializer
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody

enum class HttpMethod { GET, POST, PUT, PATCH, DELETE }

class JsonBody(
    val value: Any?,
    val serializer: SerializationStrategy<Any?>,
)

inline fun <reified B> jsonBody(value: B): JsonBody =
    JsonBody(value, serializer<B>() as SerializationStrategy<Any?>)

class Endpoint(
    val method: HttpMethod,
    val path: String,
    val query: List<Pair<String, String>> = emptyList(),
    val body: JsonBody? = null,
    val headers: Map<String, String> = emptyMap(),
) {
    companion object {
        fun get(
            path: String,
            query: List<Pair<String, String>> = emptyList(),
            headers: Map<String, String> = emptyMap(),
        ) = Endpoint(HttpMethod.GET, path, query, headers = headers)

        fun post(path: String, headers: Map<String, String> = emptyMap()) =
            Endpoint(HttpMethod.POST, path, headers = headers)

        fun post(
            path: String,
            body: JsonBody,
            headers: Map<String, String> = emptyMap(),
        ) = Endpoint(HttpMethod.POST, path, body = body, headers = headers)

        fun patch(
            path: String,
            body: JsonBody,
            headers: Map<String, String> = emptyMap(),
        ) = Endpoint(HttpMethod.PATCH, path, body = body, headers = headers)

        fun delete(path: String) = Endpoint(HttpMethod.DELETE, path)
    }
}

object ServerUrls {
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    fun buildUrl(baseUrl: HttpUrl, path: String, query: List<Pair<String, String>>): HttpUrl {
        val builder = baseUrl.newBuilder()
        path.trim('/').split('/').forEach { segment ->
            if (segment.isNotEmpty()) builder.addPathSegment(segment)
        }
        query.forEach { (name, value) -> builder.addQueryParameter(name, value) }
        return builder.build()
    }

    fun staticUrl(baseUrl: HttpUrl, path: String): HttpUrl =
        buildUrl(baseUrl, "api/static/$path", emptyList())

    fun jsonRequestBody(body: JsonBody, json: kotlinx.serialization.json.Json): RequestBody {
        val text = json.encodeToString(body.serializer, body.value)
        return RequestBody.create(jsonMediaType, text)
    }

    fun parseHttpUrl(raw: String): HttpUrl? = raw.toHttpUrlOrNull()
}
