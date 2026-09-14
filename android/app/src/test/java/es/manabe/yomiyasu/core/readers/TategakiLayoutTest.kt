package es.manabe.yomiyasu.core.readers

import es.manabe.yomiyasu.core.mokuro.MokuroParagraph
import es.manabe.yomiyasu.core.mokuro.MokuroRect
import es.manabe.yomiyasu.core.mokuro.MokuroTextBox
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TategakiLayoutTest {

    private fun makeBox(
        rect: MokuroRect,
        vertical: Boolean,
        fontSize: Float,
        paragraphs: List<String>,
    ) = MokuroTextBox(
        id = 0,
        rect = rect,
        fontSize = fontSize,
        isVertical = vertical,
        zIndex = 0,
        paragraphs = paragraphs.mapIndexed { index, text -> MokuroParagraph(index, text) },
    )

    private fun locate(
        textBox: MokuroTextBox,
        x: Float,
        y: Float,
        scale: Float = 1f,
    ): MokuroTextHit? = TategakiLayout.locate(
        box = textBox,
        pageX = x,
        pageY = y,
        scale = scale,
        fontSizeOverride = 0f,
    )

    @Test
    fun `display rect scales boxes`() {
        val textBox = makeBox(
            rect = MokuroRect(531f, 268f, 519f, 293f),
            vertical = true,
            fontSize = 32f,
            paragraphs = listOf("あ"),
        )

        val rect = TategakiLayout.displayRect(textBox, 390f / 1080f)

        assertEquals(531f * 390f / 1080f, rect.left, 0.001f)
        assertEquals(268f * 390f / 1080f, rect.top, 0.001f)
        assertEquals(519f * 390f / 1080f, rect.width, 0.001f)
        assertEquals(293f * 390f / 1080f, rect.height, 0.001f)
    }

    @Test
    fun `effective font size uses override or scaled size`() {
        assertEquals(
            20f,
            TategakiLayout.effectiveFontSize(boxFontSize = 40f, override = 0f, scale = 0.5f),
            0.001f,
        )
        assertEquals(
            24f,
            TategakiLayout.effectiveFontSize(boxFontSize = 40f, override = 24f, scale = 0.5f),
            0.001f,
        )
    }

    @Test
    fun `cell size matches mokuro metrics`() {
        assertEquals(44f, TategakiLayout.cellSize(40f), 0.001f)
    }

    @Test
    fun `vertical glyphs flow right to left in columns`() {
        val textBox = makeBox(
            rect = MokuroRect(0f, 0f, 200f, 440f),
            vertical = true,
            fontSize = 40f,
            paragraphs = listOf("あいうえおかきくけこさしすせそたちつてと", "なにぬねの"),
        )

        val glyphs = TategakiLayout.layout(textBox, fontSizeOverride = 0f, scale = 1f)

        assertEquals(25, glyphs.size)

        val first = glyphs.first { it.paragraphIndex == 0 && it.characterIndex == 0 }
        val second = glyphs.first { it.paragraphIndex == 0 && it.characterIndex == 1 }
        val eleventh = glyphs.first { it.paragraphIndex == 0 && it.characterIndex == 10 }

        assertEquals(44f, second.y - first.y, 0.001f)
        assertEquals(44f, first.x - eleventh.x, 0.001f)
        assertTrue(glyphs.first { it.paragraphIndex == 1 }.x < first.x)
    }

    @Test
    fun `horizontal glyphs flow top to bottom in lines`() {
        val textBox = makeBox(
            rect = MokuroRect(0f, 0f, 2000f, 200f),
            vertical = false,
            fontSize = 40f,
            paragraphs = listOf("あいうえおかきくけこさしすせそたちつてと", "なにぬねの"),
        )

        val glyphs = TategakiLayout.layout(textBox, fontSizeOverride = 0f, scale = 1f)

        val first = glyphs.first { it.paragraphIndex == 0 && it.characterIndex == 0 }
        val second = glyphs.first { it.paragraphIndex == 0 && it.characterIndex == 1 }

        assertEquals(44f, second.x - first.x, 0.001f)
        assertEquals(44f, glyphs.first { it.paragraphIndex == 1 }.y - first.y, 0.001f)
    }

    @Test
    fun `horizontal hit starts at first character`() {
        val textBox = makeBox(
            rect = MokuroRect(0f, 0f, 220f, 60f),
            vertical = false,
            fontSize = 40f,
            paragraphs = listOf("あいうえお"),
        )

        val result = locate(textBox, 10f, 30f)

        assertEquals(0, result?.paragraphIndex)
        assertEquals(0, result?.characterIndex)
    }

    @Test
    fun `horizontal hit ends at last character`() {
        val textBox = makeBox(
            rect = MokuroRect(0f, 0f, 220f, 60f),
            vertical = false,
            fontSize = 40f,
            paragraphs = listOf("あいうえお"),
        )

        val result = locate(textBox, 210f, 30f)

        assertEquals(0, result?.paragraphIndex)
        assertEquals(4, result?.characterIndex)
    }

    @Test
    fun `vertical hit top and bottom`() {
        val textBox = makeBox(
            rect = MokuroRect(0f, 0f, 60f, 240f),
            vertical = true,
            fontSize = 40f,
            paragraphs = listOf("あいうえお"),
        )

        assertEquals(0, locate(textBox, 30f, 10f)?.characterIndex)
        assertEquals(4, locate(textBox, 30f, 230f)?.characterIndex)
    }

    @Test
    fun `vertical paragraphs flow right to left`() {
        val textBox = makeBox(
            rect = MokuroRect(0f, 0f, 140f, 240f),
            vertical = true,
            fontSize = 40f,
            paragraphs = listOf("あいうえお", "かきくけこ"),
        )

        assertEquals(0, locate(textBox, 110f, 120f)?.paragraphIndex)
        assertEquals(1, locate(textBox, 30f, 120f)?.paragraphIndex)
    }

    @Test
    fun `scaled page uses page coordinates`() {
        val scale = 390f / 1080f
        val textBox = makeBox(
            rect = MokuroRect(0f, 0f, 300f, 150f),
            vertical = false,
            fontSize = 40f,
            paragraphs = listOf("あいうえお"),
        )

        val result = locate(textBox, 290f, 75f, scale)

        assertEquals(4, result?.characterIndex)
    }

    @Test
    fun `hit beyond text clamps to last character`() {
        val textBox = makeBox(
            rect = MokuroRect(0f, 0f, 400f, 60f),
            vertical = false,
            fontSize = 40f,
            paragraphs = listOf("あい"),
        )

        val result = locate(textBox, 390f, 30f)

        assertEquals(0, result?.paragraphIndex)
        assertEquals(1, result?.characterIndex)
    }

    @Test
    fun `empty box returns null`() {
        assertNull(TategakiLayout.locate(MokuroTextBox(0, MokuroRect(0f, 0f, 10f, 10f), 16f, false, 0, emptyList()), 1f, 1f, 1f))
    }
}
