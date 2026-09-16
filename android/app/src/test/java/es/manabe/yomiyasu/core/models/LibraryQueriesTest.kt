package es.manabe.yomiyasu.core.models

import es.manabe.yomiyasu.core.settings.RandomCriteria
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class LibraryQueriesTest {

    @Test
    fun `valoration filters are serialized when set`() {
        val query = SeriesQuery(
            variant = LibraryVariant.Manga,
            minValoration = 4,
            maxValoration = 9,
            valorationCount = 3,
        )

        val items = query.queryItems.toMap()

        assertEquals("4", items["valorationMin"])
        assertEquals("9", items["valorationMax"])
        assertEquals("3", items["valorationCount"])
        assertTrue(query.isFiltering)
    }

    @Test
    fun `valoration filters are omitted by default`() {
        val query = SeriesQuery(variant = LibraryVariant.Manga)
        val names = query.queryItems.map { it.first }

        assertFalse(names.contains("valorationMin"))
        assertFalse(names.contains("valorationMax"))
        assertFalse(names.contains("valorationCount"))
        assertFalse(query.isFiltering)
    }

    @Test
    fun `alphabet includes valoration filters but random excludes them`() {
        val query = SeriesQuery(
            variant = LibraryVariant.Manga,
            minValoration = 5,
            valorationCount = 2,
        )

        val alphabetNames = query.alphabetQueryItems.map { it.first }
        assertTrue(alphabetNames.contains("valorationMin"))
        assertTrue(alphabetNames.contains("valorationCount"))

        val randomNames = query.randomQueryItems.map { it.first }
        assertFalse(randomNames.contains("valorationMin"))
        assertFalse(randomNames.contains("valorationCount"))
        assertFalse(randomNames.contains("valorationMax"))
    }

    @Test
    fun `resetFilters clears valoration`() {
        val query = SeriesQuery(
            minValoration = 3,
            maxValoration = 8,
            valorationCount = 1,
        )

        val reset = query.resetFilters()

        assertNull(reset.minValoration)
        assertNull(reset.maxValoration)
        assertNull(reset.valorationCount)
        assertFalse(reset.isFiltering)
    }

    @Test
    fun `random criteria round trip applies filters without valoration`() {
        val query = SeriesQuery(
            variant = LibraryVariant.Manga,
            genre = "Acción",
            author = "Autor",
            status = SerieStatus.Publishing,
            firstLetter = "A",
            minDifficulty = 2,
            maxDifficulty = 7,
            readprogress = ProgressFilter.Reading,
            readlistOnly = true,
        )

        val json = Json.encodeToString(RandomCriteria.from(query))
        val decoded = Json.decodeFromString<RandomCriteria>(json)

        val applied = decoded.applyingTo(SeriesQuery(variant = LibraryVariant.Manga))

        assertEquals("Acción", applied.genre)
        assertEquals("Autor", applied.author)
        assertEquals(SerieStatus.Publishing, applied.status)
        assertEquals("A", applied.firstLetter)
        assertEquals(2, applied.minDifficulty)
        assertEquals(7, applied.maxDifficulty)
        assertEquals(ProgressFilter.Reading, applied.readprogress)
        assertTrue(applied.readlistOnly)

        val randomNames = applied.randomQueryItems.map { it.first }
        assertFalse(randomNames.contains("valorationMin"))
        assertFalse(randomNames.contains("valorationCount"))
    }
}
