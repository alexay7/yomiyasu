package es.manabe.yomiyasu.core.readers

import org.jsoup.Jsoup

data class NovelProgressMap(
    val entries: List<Entry>,
    val containsVerticalText: Boolean,
) {
    data class Entry(
        val href: String,
        val mediaType: String,
        val characters: Int,
        val cumulativeBefore: Int,
    )

    val totalCharacters: Int
        get() = entries.lastOrNull()?.let { it.cumulativeBefore + it.characters } ?: 0

    fun characters(href: String, progression: Double): Int {
        val entry = entryForHref(href) ?: return 0
        val clamped = progression.coerceIn(0.0, 1.0)
        val within = (entry.characters * clamped).toInt()
        return entry.cumulativeBefore + within
    }

    fun location(characters: Int): Pair<String, Double>? {
        if (entries.isEmpty()) return null

        val target = characters.coerceIn(0, maxOf(totalCharacters - 1, 0))

        for (entry in entries) {
            if (target < entry.cumulativeBefore + entry.characters) {
                val within = target - entry.cumulativeBefore
                val progression = if (entry.characters > 0) {
                    within.toDouble() / entry.characters.toDouble()
                } else {
                    0.0
                }
                return entry.href to progression.coerceIn(0.0, 1.0)
            }
        }

        return entries.last().let { it.href to 1.0 }
    }

    private fun entryForHref(href: String): Entry? {
        entries.firstOrNull { it.href == href }?.let { return it }

        return entries.firstOrNull { it.href.endsWith(href) || href.endsWith(it.href) }
    }

    companion object {

        fun japaneseCharacterCount(html: String): Int {
            val text = try {
                val document = Jsoup.parse(html)
                document.select("p").joinToString("") { it.text() }
            } catch (_: Exception) {
                html
            }

            var count = 0
            var index = 0

            while (index < text.length) {
                val codePoint = text.codePointAt(index)
                val isKana = codePoint in 0x3040..0x30FF
                val isKanji = codePoint in 0x4E00..0x9FFF

                if (isKana || isKanji) count++
                index += Character.charCount(codePoint)
            }

            return count
        }

        fun containsVerticalWriting(content: String): Boolean =
            content.contains("vertical-rl") ||
                content.contains("writing-mode: vertical") ||
                content.contains("writing-mode:vertical")
    }
}
