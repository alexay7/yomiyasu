package es.manabe.yomiyasu.core.models

import kotlinx.serialization.Serializable

@Serializable
data class UserWord(
    val word: String,
    val display: String = "",
    val sentence: String = "",
    val meaning: List<String> = emptyList(),
    val reading: String = "",
    val frequency: Int = 0,
    val pitch: List<Int> = emptyList(),
    val createdAt: String? = null,
) {
    val frequencyLabel: String
        get() = when {
            frequency == 0 -> "—"
            frequency < 1500 -> "Muy alta"
            frequency < 5000 -> "Alta"
            frequency < 15000 -> "Media"
            frequency < 30000 -> "Baja"
            else -> "Muy baja"
        }
}

enum class WordsSort(val rawValue: String?) {
    Newest(null),
    Oldest("new"),
    FrequencyDesc("frequency"),
    FrequencyAsc("!frequency"),
    ;

    val title: String
        get() = when (this) {
            Newest -> "Recientes"
            Oldest -> "Antiguas"
            FrequencyDesc -> "Más frecuentes"
            FrequencyAsc -> "Menos frecuentes"
        }

    val queryValue: String?
        get() = rawValue
}
