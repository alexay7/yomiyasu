package es.manabe.yomiyasu.core.models

import kotlinx.serialization.Serializable

@Serializable
data class DictionaryDisplay(
    val display: String? = null,
    val words: List<DictionaryWord> = emptyList(),
)

@Serializable
data class DictionaryWord(
    val id: String,
    val frequency: String? = null,
    val pitches: List<DictionaryPitch>? = null,
    val kanji: List<DictionaryKanji>? = null,
    val kana: List<DictionaryKana>? = null,
    val sense: List<DictionarySense>? = null,
) {
    val headword: String
        get() = kanji?.firstOrNull()?.text ?: kana?.firstOrNull()?.text ?: ""

    val mainReading: String
        get() = kana?.firstOrNull()?.text ?: ""

    val pitchPositions: List<Int>
        get() = pitches?.map { it.position } ?: emptyList()

    val frequencyRank: Int?
        get() = frequency?.toIntOrNull()

    val firstGlosses: List<String>
        get() = sense?.firstOrNull()?.gloss?.map { it.text } ?: emptyList()
}

@Serializable
data class DictionaryPitch(val position: Int)

@Serializable
data class DictionaryKanji(
    val common: Boolean? = null,
    val text: String,
    val tags: List<String>? = null,
)

@Serializable
data class DictionaryKana(
    val common: Boolean? = null,
    val text: String,
    val tags: List<String>? = null,
    val appliesToKanji: List<String>? = null,
)

@Serializable
data class DictionarySense(
    val partOfSpeech: List<String>? = null,
    val appliesToKanji: List<String>? = null,
    val appliesToKana: List<String>? = null,
    val misc: List<String>? = null,
    val gloss: List<DictionaryGloss>? = null,
)

@Serializable
data class DictionaryGloss(
    val lang: String? = null,
    val text: String,
)

@Serializable
data class UserWordRequest(
    val word: String,
    val display: String,
    val sentence: String,
    val meaning: List<String>,
    val reading: String,
    val frequency: Double,
    val pitch: List<Int>,
)

@Serializable
data class SaveWordResponse(val modifiedCount: Int = 0)
