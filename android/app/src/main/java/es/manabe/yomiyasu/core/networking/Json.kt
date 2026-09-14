package es.manabe.yomiyasu.core.networking

import kotlinx.serialization.json.Json

val YomiyasuJson: Json = Json {
    ignoreUnknownKeys = true
    isLenient = true
    explicitNulls = false
    coerceInputValues = true
    encodeDefaults = false
}
