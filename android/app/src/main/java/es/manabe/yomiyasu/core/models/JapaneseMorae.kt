package es.manabe.yomiyasu.core.models

object JapaneseMorae {

    private val smallKana = setOf(
        'ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'ゎ',
        'ャ', 'ュ', 'ョ', 'ァ', 'ィ', 'ゥ', 'ェ', 'ォ', 'ヮ',
    )

    fun split(reading: String): List<String> {
        val morae = mutableListOf<String>()

        for (character in reading) {
            if (character in smallKana && morae.isNotEmpty()) {
                morae[morae.size - 1] = morae.last() + character
            } else {
                morae.add(character.toString())
            }
        }

        return morae
    }

    fun accentPattern(moraeCount: Int, accent: Int): List<Boolean> {
        if (moraeCount <= 0) return emptyList()

        if (accent <= 0) {
            return (0 until moraeCount).map { it > 0 }
        }

        if (accent == 1) {
            return (0 until moraeCount).map { it == 0 }
        }

        return (0 until moraeCount).map { index ->
            index >= 1 && index < accent
        }
    }
}
