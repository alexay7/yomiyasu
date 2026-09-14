package es.manabe.yomiyasu.core.readers

import es.manabe.yomiyasu.core.mokuro.MokuroRect
import es.manabe.yomiyasu.core.mokuro.MokuroTextBox
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max

data class MokuroTextHit(
    val paragraphIndex: Int,
    val characterIndex: Int,
)

data class TategakiGlyph(
    val paragraphIndex: Int,
    val characterIndex: Int,
    val text: String,
    val x: Float,
    val y: Float,
    val cell: Float,
)

/**
 * Reproduce la disposición y el hit-testing del visor de mokuro en CoreText:
 * avance de carácter y paso de línea/columna de 1.1 em (1 em + 0.1 de letter-spacing).
 */
object TategakiLayout {

    fun displayRect(box: MokuroTextBox, scale: Float): MokuroRect = MokuroRect(
        left = box.rect.left * scale,
        top = box.rect.top * scale,
        width = box.rect.width * scale,
        height = box.rect.height * scale,
    )

    fun effectiveFontSize(boxFontSize: Float, override: Float, scale: Float): Float {
        if (override > 0f) return override
        return max(1f, boxFontSize * scale)
    }

    fun cellSize(fontSize: Float): Float = fontSize * 1.1f

    fun layout(
        box: MokuroTextBox,
        fontSizeOverride: Float,
        scale: Float,
    ): List<TategakiGlyph> {
        val rect = displayRect(box, scale)
        if (rect.width <= 0f || rect.height <= 0f) return emptyList()

        val fontSize = effectiveFontSize(box.fontSize, fontSizeOverride, scale)
        val cell = cellSize(fontSize)
        val glyphs = mutableListOf<TategakiGlyph>()
        val paragraphs = box.paragraphs.map { codePoints(it.text) }

        if (box.isVertical) {
            val columns = max(1, floor(rect.width / cell).toInt())
            val charsPerColumn = max(1, floor(rect.height / cell).toInt())
            var columnStart = 0

            paragraphs.forEachIndexed { paragraphIndex, chars ->
                chars.forEachIndexed { charIndex, text ->
                    val column = columnStart + charIndex / charsPerColumn
                    if (column >= columns) return@forEachIndexed

                    val row = charIndex % charsPerColumn
                    glyphs.add(
                        TategakiGlyph(
                            paragraphIndex = paragraphIndex,
                            characterIndex = charIndex,
                            text = text,
                            x = rect.left + rect.width - (column + 1) * cell,
                            y = rect.top + row * cell,
                            cell = cell,
                        ),
                    )
                }

                columnStart = columnStart + max(1, ceil(chars.size.toFloat() / charsPerColumn).toInt())
            }
        } else {
            val lines = max(1, floor(rect.height / cell).toInt())
            val charsPerLine = max(1, floor(rect.width / cell).toInt())
            var lineStart = 0

            paragraphs.forEachIndexed { paragraphIndex, chars ->
                chars.forEachIndexed { charIndex, text ->
                    val line = lineStart + charIndex / charsPerLine
                    if (line >= lines) return@forEachIndexed

                    val column = charIndex % charsPerLine
                    glyphs.add(
                        TategakiGlyph(
                            paragraphIndex = paragraphIndex,
                            characterIndex = charIndex,
                            text = text,
                            x = rect.left + column * cell,
                            y = rect.top + line * cell,
                            cell = cell,
                        ),
                    )
                }

                lineStart = lineStart + max(1, ceil(chars.size.toFloat() / charsPerLine).toInt())
            }
        }

        return glyphs
    }

    fun locate(
        box: MokuroTextBox,
        pageX: Float,
        pageY: Float,
        scale: Float,
        fontSizeOverride: Float = 0f,
    ): MokuroTextHit? {
        val paragraphs = box.paragraphs
        if (paragraphs.isEmpty()) return null

        val rect = displayRect(box, scale)
        if (rect.width <= 0f || rect.height <= 0f) return null

        val viewX = pageX * scale
        val viewY = pageY * scale
        val localX = viewX - rect.left
        val localY = viewY - rect.top

        val fontSize = effectiveFontSize(box.fontSize, fontSizeOverride, scale)
        val cell = cellSize(fontSize)
        val chars = paragraphs.map { codePoints(it.text) }

        if (box.isVertical) {
            val columns = max(1, floor(rect.width / cell).toInt())
            val charsPerColumn = max(1, floor(rect.height / cell).toInt())

            val columnIndex = floor((rect.width - localX) / cell).toInt().coerceIn(0, columns - 1)
            val row = floor(localY / cell).toInt().coerceAtLeast(0)

            var startColumn = 0
            var lastParagraph = 0

            chars.forEachIndexed { paragraphIndex, list ->
                val paragraphColumns = max(1, ceil(list.size.toFloat() / charsPerColumn).toInt())

                if (columnIndex < startColumn + paragraphColumns) {
                    val within = columnIndex - startColumn
                    val index = within * charsPerColumn + row
                    return MokuroTextHit(
                        paragraphIndex = paragraphIndex,
                        characterIndex = index.coerceIn(0, max(list.size - 1, 0)),
                    )
                }

                startColumn += paragraphColumns
                lastParagraph = paragraphIndex
            }

            return MokuroTextHit(lastParagraph, max(chars[lastParagraph].size - 1, 0))
        }

        val lines = max(1, floor(rect.height / cell).toInt())
        val charsPerLine = max(1, floor(rect.width / cell).toInt())

        val lineIndex = floor(localY / cell).toInt().coerceIn(0, lines - 1)
        val column = floor(localX / cell).toInt().coerceAtLeast(0)

        var startLine = 0
        var lastParagraph = 0

        chars.forEachIndexed { paragraphIndex, list ->
            val paragraphLines = max(1, ceil(list.size.toFloat() / charsPerLine).toInt())

            if (lineIndex < startLine + paragraphLines) {
                val within = lineIndex - startLine
                val index = within * charsPerLine + column
                return MokuroTextHit(
                    paragraphIndex = paragraphIndex,
                    characterIndex = index.coerceIn(0, max(list.size - 1, 0)),
                )
            }

            startLine += paragraphLines
            lastParagraph = paragraphIndex
        }

        return MokuroTextHit(lastParagraph, max(chars[lastParagraph].size - 1, 0))
    }

    fun codePoints(text: String): List<String> {
        val result = mutableListOf<String>()
        var index = 0

        while (index < text.length) {
            val codePoint = text.codePointAt(index)
            val charCount = Character.charCount(codePoint)
            result.add(text.substring(index, index + charCount))
            index += charCount
        }

        return result
    }
}
