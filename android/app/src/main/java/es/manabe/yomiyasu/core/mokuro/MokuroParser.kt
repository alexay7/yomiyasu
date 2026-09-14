package es.manabe.yomiyasu.core.mokuro

import org.jsoup.Jsoup

data class MokuroBook(val pages: List<MokuroPage>)

data class MokuroPage(
    val id: Int,
    val imagePath: String,
    val size: MokuroSize,
    val boxes: List<MokuroTextBox>,
)

data class MokuroSize(val width: Float, val height: Float)

data class MokuroRect(
    val left: Float,
    val top: Float,
    val width: Float,
    val height: Float,
)

data class MokuroTextBox(
    val id: Int,
    val rect: MokuroRect,
    val fontSize: Float,
    val isVertical: Boolean,
    val zIndex: Int,
    val paragraphs: List<MokuroParagraph>,
)

data class MokuroParagraph(val id: Int, val text: String)

class MokuroParserException(message: String) : Exception(message)

object MokuroParser {

    fun parse(html: String): MokuroBook {
        val document = try {
            Jsoup.parse(html)
        } catch (error: Exception) {
            throw MokuroParserException("HTML inválido")
        }

        val pageElements = document.select("div.page")

        val pages = mutableListOf<MokuroPage>()

        for (pageElement in pageElements) {
            val container = pageElement.select("div.pageContainer").first() ?: continue

            val containerStyle = parseStyle(container.attr("style"))

            val width = containerStyle["width"]?.let(::number)
            val height = containerStyle["height"]?.let(::number)
            val imagePath = containerStyle["background-image"]?.let(::backgroundImagePath)

            if (width == null || height == null || width <= 0 || height <= 0 || imagePath.isNullOrEmpty()) {
                continue
            }

            val textBoxElements = container.select("div.textBox")
            val boxes = mutableListOf<MokuroTextBox>()

            textBoxElements.forEachIndexed { boxIndex, boxElement ->
                val boxStyle = parseStyle(boxElement.attr("style"))

                val left = boxStyle["left"]?.let(::number) ?: 0f
                val top = boxStyle["top"]?.let(::number) ?: 0f
                val boxWidth = boxStyle["width"]?.let(::number) ?: 0f
                val boxHeight = boxStyle["height"]?.let(::number) ?: 0f
                val fontSize = boxStyle["font-size"]?.let(::number) ?: 16f
                val isVertical = boxStyle["writing-mode"]?.contains("vertical") ?: false
                val zIndex = boxStyle["z-index"]?.let { int(it) } ?: 0

                if (boxWidth <= 0 || boxHeight <= 0) return@forEachIndexed

                val paragraphTexts = boxElement.select("p")
                    .map { it.text() }
                    .filter { it.isNotBlank() }

                if (paragraphTexts.isEmpty()) return@forEachIndexed

                boxes.add(
                    MokuroTextBox(
                        id = boxIndex,
                        rect = MokuroRect(left, top, boxWidth, boxHeight),
                        fontSize = fontSize,
                        isVertical = isVertical,
                        zIndex = zIndex,
                        paragraphs = paragraphTexts.mapIndexed { index, text ->
                            MokuroParagraph(id = index, text = text)
                        },
                    ),
                )
            }

            boxes.sortBy { it.zIndex }

            pages.add(
                MokuroPage(
                    id = pages.size,
                    imagePath = imagePath,
                    size = MokuroSize(width, height),
                    boxes = boxes,
                ),
            )
        }

        return MokuroBook(pages)
    }

    fun parseStyle(style: String): Map<String, String> {
        val result = mutableMapOf<String, String>()

        for (declaration in style.split(';')) {
            val separatorIndex = declaration.indexOf(':')
            if (separatorIndex < 0) continue

            val key = declaration.substring(0, separatorIndex).trim().lowercase()
            val value = declaration.substring(separatorIndex + 1).trim()

            if (key.isNotEmpty() && value.isNotEmpty()) {
                result[key] = value
            }
        }

        return result
    }

    fun backgroundImagePath(value: String): String? {
        var path = value

        val range = path.indexOf("url(", ignoreCase = true)
        if (range >= 0) {
            path = path.substring(range + 4)
        }

        path = path.trim { it in "\"' )" }

        return path.ifEmpty { null }
    }

    fun number(value: String): Float? {
        val digits = StringBuilder()
        var separatorSeen = false

        for (character in value.trim()) {
            when {
                character.isDigit() -> digits.append(character)
                character == '.' || character == ',' -> {
                    if (separatorSeen) break
                    digits.append('.')
                    separatorSeen = true
                }
                else -> break
            }
        }

        return digits.toString().toFloatOrNull()
    }

    fun int(value: String): Int? = number(value)?.toInt()
}
