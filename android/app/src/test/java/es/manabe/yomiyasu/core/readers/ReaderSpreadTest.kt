package es.manabe.yomiyasu.core.readers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ReaderSpreadTest {

    @Test
    fun `single page when double page disabled`() {
        val spreads = SpreadLayout.spreads(pageCount = 4, doublePage = false, hasCover = true)

        assertEquals(4, spreads.size)
        assertEquals(listOf(0), spreads[0].pages)
        assertEquals(listOf(3), spreads[3].pages)
    }

    @Test
    fun `cover as lone first spread`() {
        val spreads = SpreadLayout.spreads(pageCount = 5, doublePage = true, hasCover = true)

        assertEquals(listOf(0), spreads[0].pages)
        assertEquals(listOf(1, 2), spreads[1].pages)
        assertEquals(listOf(3, 4), spreads[2].pages)
        assertEquals(3, spreads.size)
    }

    @Test
    fun `no cover pairs from first page`() {
        val spreads = SpreadLayout.spreads(pageCount = 5, doublePage = true, hasCover = false)

        assertEquals(listOf(0, 1), spreads[0].pages)
        assertEquals(listOf(2, 3), spreads[1].pages)
        assertEquals(listOf(4), spreads[2].pages)
    }

    @Test
    fun `odd final page stays alone`() {
        val spreads = SpreadLayout.spreads(pageCount = 4, doublePage = true, hasCover = true)

        assertEquals(listOf(0), spreads[0].pages)
        assertEquals(listOf(1, 2), spreads[1].pages)
        assertEquals(listOf(3), spreads[2].pages)
    }

    @Test
    fun `spread index mapping with cover`() {
        assertEquals(0, SpreadLayout.spreadIndex(page = 0, doublePage = true, hasCover = true))
        assertEquals(1, SpreadLayout.spreadIndex(page = 1, doublePage = true, hasCover = true))
        assertEquals(1, SpreadLayout.spreadIndex(page = 2, doublePage = true, hasCover = true))
        assertEquals(2, SpreadLayout.spreadIndex(page = 3, doublePage = true, hasCover = true))
    }

    @Test
    fun `spread index mapping without cover`() {
        assertEquals(0, SpreadLayout.spreadIndex(page = 0, doublePage = true, hasCover = false))
        assertEquals(0, SpreadLayout.spreadIndex(page = 1, doublePage = true, hasCover = false))
        assertEquals(1, SpreadLayout.spreadIndex(page = 2, doublePage = true, hasCover = false))
    }

    @Test
    fun `empty book has no spreads`() {
        assertTrue(SpreadLayout.spreads(pageCount = 0, doublePage = true, hasCover = true).isEmpty())
    }
}
