package es.manabe.yomiyasu.core.mokuro

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MokuroParserTest {

    private fun loadSynthetic(): MokuroBook {
        val html = javaClass.classLoader!!
            .getResourceAsStream("synthetic_mokuro.html")!!
            .bufferedReader()
            .readText()

        return MokuroParser.parse(html)
    }

    @Test
    fun `synthetic fixture parses all pages`() {
        val book = loadSynthetic()

        assertEquals(5, book.pages.size)
        assertEquals(listOf(0, 1, 2, 3, 4), book.pages.map { it.id })
    }

    @Test
    fun `page with single horizontal box`() {
        val page = loadSynthetic().pages[0]

        assertEquals("serie%20v01/001-or8_compressed.jpg", page.imagePath)
        assertEquals(1080f, page.size.width)
        assertEquals(1530f, page.size.height)
        assertEquals(1, page.boxes.size)

        val box = page.boxes[0]
        assertEquals(191f, box.rect.left)
        assertEquals(1423f, box.rect.top)
        assertEquals(685f, box.rect.width)
        assertEquals(21f, box.rect.height)
        assertEquals(21f, box.fontSize)
        assertFalse(box.isVertical)
        assertEquals(listOf("★この作品はテストです"), box.paragraphs.map { it.text })
    }

    @Test
    fun `page with horizontal and vertical boxes`() {
        val page = loadSynthetic().pages[1]

        assertEquals(2, page.boxes.size)

        val horizontal = page.boxes[0]
        assertFalse(horizontal.isVertical)
        assertEquals(
            listOf("もし芸能人の子供に", "生まれていたらと", "考えた事はある？"),
            horizontal.paragraphs.map { it.text },
        )

        val vertical = page.boxes[1]
        assertTrue(vertical.isVertical)
        assertEquals(15, vertical.zIndex)
        assertEquals(3, vertical.paragraphs.size)
    }

    @Test
    fun `page without text boxes is kept`() {
        assertTrue(loadSynthetic().pages[2].boxes.isEmpty())
    }

    @Test
    fun `whitespace only paragraphs are skipped`() {
        assertTrue(loadSynthetic().pages[3].boxes.isEmpty())
    }

    @Test
    fun `unknown font size falls back to default`() {
        val box = loadSynthetic().pages[4].boxes.first()
        assertEquals(16f, box.fontSize)
    }

    @Test
    fun `style parsing`() {
        val style = MokuroParser.parseStyle(
            "width:1080; height:1530; background-image:url(\"a/b.jpg\"); font-size:21px; z-index:15; writing-mode:vertical-rl;",
        )

        assertEquals("1080", style["width"])
        assertEquals("21px", style["font-size"])
        assertEquals("vertical-rl", style["writing-mode"])
        assertEquals("url(\"a/b.jpg\")", style["background-image"])
    }

    @Test
    fun `background image path variants`() {
        assertEquals(
            "oshi%20v01/001.jpg",
            MokuroParser.backgroundImagePath("url(\"oshi%20v01/001.jpg\")"),
        )
        assertEquals(
            "a/b c.jpg",
            MokuroParser.backgroundImagePath("url('a/b c.jpg')"),
        )
        assertEquals(
            "images/001.jpg",
            MokuroParser.backgroundImagePath("url(images/001.jpg)"),
        )
        assertNull(MokuroParser.backgroundImagePath("url()"))
    }

    @Test
    fun `number parsing`() {
        assertEquals(1080f, MokuroParser.number("1080"))
        assertEquals(21f, MokuroParser.number("21px"))
        assertEquals(1.5f, MokuroParser.number(" 1.5em"))
        assertNull(MokuroParser.number("auto"))
    }
}
