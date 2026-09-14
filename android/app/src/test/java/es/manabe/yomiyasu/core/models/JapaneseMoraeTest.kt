package es.manabe.yomiyasu.core.models

import org.junit.Assert.assertEquals
import org.junit.Test

class JapaneseMoraeTest {

    @Test
    fun `split keeps small kana with previous mora`() {
        val morae = JapaneseMorae.split("きょうと")

        assertEquals(listOf("きょ", "う", "と"), morae)
    }

    @Test
    fun `split handles katakana small kana`() {
        val morae = JapaneseMorae.split("シャシン")

        assertEquals(listOf("シャ", "シ", "ン"), morae)
    }

    @Test
    fun `heiban accent marks all but first as high`() {
        val pattern = JapaneseMorae.accentPattern(moraeCount = 4, accent = 0)

        assertEquals(listOf(false, true, true, true), pattern)
    }

    @Test
    fun `atamadaka accent marks only first as high`() {
        val pattern = JapaneseMorae.accentPattern(moraeCount = 3, accent = 1)

        assertEquals(listOf(true, false, false), pattern)
    }

    @Test
    fun `nakadaka accent marks middle morae as high`() {
        val pattern = JapaneseMorae.accentPattern(moraeCount = 5, accent = 3)

        assertEquals(listOf(false, true, true, false, false), pattern)
    }

    @Test
    fun `empty reading yields empty pattern`() {
        assertEquals(emptyList<Boolean>(), JapaneseMorae.accentPattern(moraeCount = 0, accent = 1))
    }
}
