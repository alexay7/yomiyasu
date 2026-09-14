package es.manabe.yomiyasu.core.readers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class NovelProgressMapTest {

    private fun map(
        entries: List<Pair<String, Int>>,
        vertical: Boolean = false,
    ): NovelProgressMap {
        var cumulative = 0
        val result = entries.map { (href, characters) ->
            NovelProgressMap.Entry(
                href = href,
                mediaType = "application/xhtml+xml",
                characters = characters,
                cumulativeBefore = cumulative,
            ).also { cumulative += characters }
        }

        return NovelProgressMap(entries = result, containsVerticalText = vertical)
    }

    @Test
    fun `japanese character count ignores latin and punctuation`() {
        val count = NovelProgressMap.japaneseCharacterCount(
            "<html><body><p>こんにちは、世界！</p><p>Hello 123</p><p>漢字とカナ</p></body></html>",
        )

        assertEquals(12, count)
    }

    @Test
    fun `japanese character count without paragraphs counts zero`() {
        val count = NovelProgressMap.japaneseCharacterCount("あいうえお")

        assertEquals(0, count)
    }

    @Test
    fun `characters maps progression within resource`() {
        val progressMap = map(listOf("a.xhtml" to 100, "b.xhtml" to 50))

        assertEquals(0, progressMap.characters("a.xhtml", 0.0))
        assertEquals(100, progressMap.characters("a.xhtml", 1.0))
        assertEquals(150, progressMap.characters("b.xhtml", 1.0))
        assertEquals(125, progressMap.characters("b.xhtml", 0.5))
    }

    @Test
    fun `characters clamps progression`() {
        val progressMap = map(listOf("a.xhtml" to 100))

        assertEquals(0, progressMap.characters("a.xhtml", -1.0))
        assertEquals(100, progressMap.characters("a.xhtml", 2.0))
    }

    @Test
    fun `unknown href returns zero`() {
        val progressMap = map(listOf("a.xhtml" to 100))

        assertEquals(0, progressMap.characters("zzz.xhtml", 1.0))
    }

    @Test
    fun `suffix href matching works both ways`() {
        val progressMap = map(listOf("OEBPS/text/a.xhtml" to 100))

        assertEquals(100, progressMap.characters("text/a.xhtml", 1.0))
        assertEquals(100, progressMap.characters("a.xhtml", 1.0))
    }

    @Test
    fun `location finds resource and progression`() {
        val progressMap = map(listOf("a.xhtml" to 100, "b.xhtml" to 50))

        val first = progressMap.location(50)
        assertEquals("a.xhtml", first?.first)
        assertEquals(0.5, first?.second ?: 0.0, 0.001)

        val second = progressMap.location(120)
        assertEquals("b.xhtml", second?.first)
        assertEquals(0.4, second?.second ?: 0.0, 0.001)
    }

    @Test
    fun `location clamps to last resource`() {
        val progressMap = map(listOf("a.xhtml" to 100))

        val result = progressMap.location(500)

        assertEquals("a.xhtml", result?.first)
        assertEquals(0.99, result?.second ?: 0.0, 0.001)
    }

    @Test
    fun `location of empty map is null`() {
        assertNull(map(emptyList()).location(0))
    }

    @Test
    fun `total characters sums entries`() {
        assertEquals(150, map(listOf("a" to 100, "b" to 50)).totalCharacters)
        assertEquals(0, map(emptyList()).totalCharacters)
    }

    @Test
    fun `vertical writing detection`() {
        assertTrue(NovelProgressMap.containsVerticalWriting("body { writing-mode: vertical-rl; }"))
        assertTrue(NovelProgressMap.containsVerticalWriting("style='writing-mode:vertical-rl'"))
        assertFalse(NovelProgressMap.containsVerticalWriting("body { line-height: 1.5; }"))
    }
}
