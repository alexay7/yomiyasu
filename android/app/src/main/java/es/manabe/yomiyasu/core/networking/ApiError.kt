package es.manabe.yomiyasu.core.networking

import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.descriptors.buildClassSerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive

@Serializable(with = ErrorEnvelopeSerializer::class)
data class ErrorEnvelope(
    val statusCode: Int = 0,
    val message: String? = null,
    val status: Kind? = null,
) {
    enum class Kind {
        @SerialName("ACCESS")
        Access,

        @SerialName("REFRESH")
        Refresh,

        @SerialName("NONE")
        None,
    }
}

object ErrorEnvelopeSerializer : KSerializer<ErrorEnvelope> {
    override val descriptor: SerialDescriptor = buildClassSerialDescriptor("ErrorEnvelope")

    override fun deserialize(decoder: Decoder): ErrorEnvelope {
        val jsonDecoder = decoder as? JsonDecoder
            ?: return ErrorEnvelope()
        val element: JsonElement = jsonDecoder.decodeJsonElement()
        val obj = element as? JsonObject ?: return ErrorEnvelope()

        val statusCode = obj["statusCode"]?.jsonPrimitive?.intOrNull ?: 0

        val message: String? = when (val raw = obj["message"]) {
            is JsonPrimitive -> raw.contentOrNull
            is JsonElement -> runCatching {
                raw.jsonArray.mapNotNull { it.jsonPrimitive.contentOrNull }.joinToString("\n")
            }.getOrNull()
            else -> null
        }

        val status = obj["status"]?.jsonPrimitive?.contentOrNull?.let { value ->
            ErrorEnvelope.Kind.entries.firstOrNull { it.name.equals(value, ignoreCase = true) }
        }

        return ErrorEnvelope(statusCode = statusCode, message = message, status = status)
    }

    override fun serialize(encoder: Encoder, value: ErrorEnvelope) {
        throw UnsupportedOperationException("ErrorEnvelope no se serializa")
    }
}

sealed class ApiException(
    message: String?,
    val userMessage: String,
    cause: Throwable? = null,
) : Exception(message, cause) {

    class InvalidUrl : ApiException(
        message = "invalid-url",
        userMessage = "La dirección del servidor no es válida.",
    )

    class ServerNotConfigured : ApiException(
        message = "server-not-configured",
        userMessage = "No hay ningún servidor configurado.",
    )

    class Transport(cause: Throwable) : ApiException(
        message = cause.message,
        userMessage = "No se ha podido conectar con el servidor.",
        cause = cause,
    )

    class UnexpectedResponse : ApiException(
        message = "unexpected-response",
        userMessage = "Respuesta inesperada del servidor.",
    )

    class Decoding(cause: Throwable) : ApiException(
        message = cause.message,
        userMessage = "No se ha podido leer la respuesta del servidor.",
        cause = cause,
    )

    class Http(
        val status: Int,
        val envelope: ErrorEnvelope? = null,
    ) : ApiException(
        message = "http-$status",
        userMessage = envelope?.message ?: "Error del servidor ($status).",
    )

    class SessionExpired : ApiException(
        message = "session-expired",
        userMessage = "La sesión ha caducado. Vuelve a iniciar sesión.",
    )
}
