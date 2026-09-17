package es.manabe.yomiyasu.core.models

import es.manabe.yomiyasu.core.networking.ErrorEnvelope
import es.manabe.yomiyasu.core.networking.YomiyasuJson
import kotlinx.serialization.builtins.ListSerializer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ModelDecodingTest {

    private val json = YomiyasuJson

    @Test
    fun `serie decodes with id and readlist bool`() {
        val serie = json.decodeFromString(
            Serie.serializer(),
            """{"_id":"s1","visibleName":"Oshi","readlist":true,"unreadBooks":3,"bookCount":5}""",
        )

        assertEquals("s1", serie.id)
        assertTrue(serie.isInReadlist)
        assertEquals(3, serie.unreadCount)
        assertEquals(0.4, serie.progressFraction, 0.001)
    }

    @Test
    fun `serie decodes readlist object`() {
        val serie = json.decodeFromString(
            Serie.serializer(),
            """{"_id":"s1","visibleName":"Oshi","readlist":{"_id":"r1","serie":"s1"}}""",
        )

        assertTrue(serie.isInReadlist)
    }

    @Test
    fun `serie decodes missing readlist as false`() {
        val serie = json.decodeFromString(
            Serie.serializer(),
            """{"_id":"s1","visibleName":"Oshi","readlist":null}""",
        )

        assertFalse(serie.isInReadlist)
        assertNull(serie.readlist)
    }

    @Test
    fun `serie decodes readlist object without id as false`() {
        val serie = json.decodeFromString(
            Serie.serializer(),
            """{"_id":"s1","visibleName":"Oshi","readlist":{}}""",
        )

        assertFalse(serie.isInReadlist)
    }

    @Test
    fun `serie accepts current book as id or object`() {
        val withId = json.decodeFromString(
            Serie.serializer(),
            """{"_id":"s1","visibleName":"Oshi","currentBook":"b1"}""",
        )
        val withBook = json.decodeFromString(
            Serie.serializer(),
            """{"_id":"s1","visibleName":"Oshi","currentBook":{"_id":"b2","visibleName":"Tomo 2","pages":180}}""",
        )

        assertEquals("b1", withId.currentBook?.id)
        assertEquals("b2", withBook.currentBook?.id)
    }

    @Test
    fun `book decodes page chars and progress`() {
        val book = json.decodeFromString(
            Book.serializer(),
            """{"_id":"b1","visibleName":"Tomo 1","pages":200,"pageChars":[0,10,50],"characters":1000,
               "lastProgress":{"_id":"p1","currentPage":100,"characters":500,"status":"reading"}}""",
        )

        assertEquals(200, book.pages)
        assertEquals(listOf(0, 10, 50), book.pageChars)
        assertEquals(1000, book.characters)
        assertEquals(0.5, book.progressFraction, 0.001)
        assertEquals(ProgressStatus.Reading, book.lastProgress?.status)
        assertEquals(ProgressStatus.Unread, book.resolvedStatus)
    }

    @Test
    fun `book progress fraction falls back to characters`() {
        val book = json.decodeFromString(
            Book.serializer(),
            """{"_id":"b1","visibleName":"Novela","characters":2000,
               "lastProgress":{"_id":"p1","characters":1500,"status":"reading"}}""",
        )

        assertEquals(0.75, book.progressFraction, 0.001)
    }

    @Test
    fun `book decodes image folder format and page paths`() {
        val book = json.decodeFromString(
            Book.serializer(),
            """{"_id":"b2","visibleName":"Tomo imágenes","format":"images",
               "pagePaths":["001.jpg","002.jpg","010.jpg"],"variant":"manga"}""",
        )

        assertTrue(book.isImageFolder)
        assertEquals(listOf("001.jpg", "002.jpg", "010.jpg"), book.pagePaths)
    }

    @Test
    fun `book without format is treated as mokuro`() {
        val book = json.decodeFromString(
            Book.serializer(),
            """{"_id":"b3","visibleName":"Tomo","variant":"manga"}""",
        )

        assertFalse(book.isImageFolder)
        assertNull(book.format)
        assertNull(book.pagePaths)
    }

    @Test
    fun `unknown fields are ignored`() {
        val book = json.decodeFromString(
            Book.serializer(),
            """{"_id":"b1","visibleName":"Tomo","whatever":123,"nested":{"a":1}}""",
        )

        assertEquals("b1", book.id)
    }

    @Test
    fun `error envelope decodes string and array messages`() {
        val single = json.decodeFromString(
            ErrorEnvelope.serializer(),
            """{"statusCode":400,"message":"Datos inválidos","status":"ACCESS"}""",
        )
        val many = json.decodeFromString(
            ErrorEnvelope.serializer(),
            """{"statusCode":400,"message":["uno","dos"]}""",
        )

        assertEquals("Datos inválidos", single.message)
        assertEquals(ErrorEnvelope.Kind.Access, single.status)
        assertEquals("uno\ndos", many.message)
    }

    @Test
    fun `dictionary v1 array decodes`() {
        val displays = json.decodeFromString(
            ListSerializer(DictionaryDisplay.serializer()),
            """[{"display":"読む","words":[{"id":"1","frequency":"1200","pitches":[{"position":1}],
               "kanji":[{"text":"読む","common":true}],"kana":[{"text":"よむ"}],
               "sense":[{"partOfSpeech":["v5m"],"gloss":[{"lang":"eng","text":"to read"}]}]}]}]""",
        )

        val word = displays.first().words.first()
        assertEquals("読む", word.headword)
        assertEquals("よむ", word.mainReading)
        assertEquals(1200, word.frequencyRank)
        assertEquals(listOf(1), word.pitchPositions)
        assertEquals(listOf("to read"), word.firstGlosses)
    }

    @Test
    fun `dictionary v2 tokens decode with display`() {
        val displays = json.decodeFromString(
            ListSerializer(DictionaryDisplay.serializer()),
            """[{"display":"読む","words":[]},{"display":"本","words":[]}]""",
        )

        assertEquals(listOf("読む", "本"), displays.map { it.display })
    }

    @Test
    fun `user words decode and label frequency`() {
        val words = json.decodeFromString(
            ListSerializer(UserWord.serializer()),
            """[{"word":"読む","display":"読む","sentence":"本を読む","meaning":["leer"],"reading":"よむ",
               "frequency":900,"pitch":[1]}]""",
        )

        assertEquals("Muy alta", words.first().frequencyLabel)
        assertEquals(900, words.first().frequency)
    }

    @Test
    fun `monthly graphs decode month id`() {
        val graphs = json.decodeFromString(
            MonthlyGraphs.serializer(),
            """{"manga":[{"_id":{"year":2026,"month":8},"totalCharacters":1000,"totalTime":60,
               "meanReadSpeed":500.0,"totalHours":1.0}],"novela":[]}""",
        )

        assertEquals(2026, graphs.manga.first().monthId.year)
        assertEquals("2026-8", graphs.manga.first().id)
    }

    @Test
    fun `progress record log line matches ios format`() {
        val record = json.decodeFromString(
            ProgressRecord.serializer(),
            """{"_id":"p1","currentPage":42,"characters":300,"time":3600,"variant":"manga",
               "bookInfo":{"_id":"b1","visibleName":"Tomo 1"}}""",
        )
        val novel = json.decodeFromString(
            ProgressRecord.serializer(),
            """{"_id":"p2","characters":1500,"time":120,"variant":"novela",
               "bookInfo":{"_id":"b2","visibleName":"Novela 1"}}""",
        )

        assertEquals(".log manga 42 Tomo 1;60&300", record.logLine)
        assertEquals(".log lectura 1500 Novela 1;2", novel.logLine)
    }
}
