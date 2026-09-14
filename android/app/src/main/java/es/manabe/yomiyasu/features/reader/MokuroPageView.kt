package es.manabe.yomiyasu.features.reader

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import es.manabe.yomiyasu.core.mokuro.MokuroPage
import es.manabe.yomiyasu.core.mokuro.MokuroTextBox
import es.manabe.yomiyasu.core.readers.MokuroTextHit
import es.manabe.yomiyasu.core.readers.TategakiLayout
import es.manabe.yomiyasu.core.settings.ReaderFont
import es.manabe.yomiyasu.core.settings.ZoomMode
import kotlin.math.min

@Composable
fun readerFontFamily(font: ReaderFont): FontFamily {
    val assets = LocalContext.current.assets
    return when (font) {
        ReaderFont.System -> FontFamily.Default
        else -> FontFamily(Font("fonts/${font.fontAsset}", assets))
    }
}

@Composable
fun MokuroPageView(
    page: MokuroPage,
    imageModel: Any?,
    fitMode: ZoomMode,
    fontSizeOverride: Float,
    displayOCR: Boolean,
    textBoxBorders: Boolean,
    selectedBoxId: Int?,
    font: ReaderFont,
    onBoxTap: (MokuroTextBox, MokuroTextHit, Offset) -> Unit,
    onPageTap: (Offset) -> Unit,
    modifier: Modifier = Modifier,
) {
    val density = LocalDensity.current
    val measurer = rememberTextMeasurer()
    val fontFamily = readerFontFamily(font)

    BoxWithConstraints(modifier = modifier) {
        val containerWidthPx = constraints.maxWidth.toFloat()
        val containerHeightPx = constraints.maxHeight.toFloat()

        val pageWidth = page.size.width
        val pageHeight = page.size.height

        val fitScale = when (fitMode) {
            ZoomMode.FitWidth -> if (pageWidth > 0) containerWidthPx / pageWidth else 1f
            ZoomMode.Original -> with(density) { 1.dp.toPx() }
            else -> min(
                if (pageWidth > 0) containerWidthPx / pageWidth else 1f,
                if (pageHeight > 0) containerHeightPx / pageHeight else 1f,
            )
        }.takeIf { it.isFinite() && it > 0f } ?: 1f

        Box(
            modifier = Modifier
                .align(Alignment.Center)
                .size(
                    width = with(density) { (pageWidth * fitScale).toDp() },
                    height = with(density) { (pageHeight * fitScale).toDp() },
                )
                .pointerInput(page.id, fitScale, fontSizeOverride, displayOCR, selectedBoxId) {
                    detectTapGestures { position ->
                        handlePageTap(
                            position = position,
                            fitScale = fitScale,
                            page = page,
                            fontSizeOverride = fontSizeOverride,
                            onBoxTap = onBoxTap,
                            onPageTap = onPageTap,
                        )
                    }
                },
        ) {
            AsyncImage(
                model = imageModel,
                contentDescription = page.imagePath,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.FillBounds,
            )

            Canvas(modifier = Modifier.fillMaxSize()) {
                page.boxes.forEach { box ->
                    val highlighted = box.id == selectedBoxId
                    val showingText = highlighted || displayOCR

                    if (showingText) {
                        val displayRect = TategakiLayout.displayRect(box, fitScale)
                        drawRect(
                            color = if (highlighted) {
                                Color(0xFFFFEB3B).copy(alpha = 0.35f)
                            } else {
                                Color.White
                            },
                            topLeft = Offset(displayRect.left, displayRect.top),
                            size = Size(displayRect.width, displayRect.height),
                        )

                        drawTategakiGlyphs(
                            box = box,
                            fitScale = fitScale,
                            fontSizeOverride = fontSizeOverride,
                            fontFamily = fontFamily,
                            measurer = measurer,
                        )
                    }

                    if (textBoxBorders) {
                        val displayRect = TategakiLayout.displayRect(box, fitScale)
                        drawRect(
                            color = Color.Red.copy(alpha = 0.4f),
                            topLeft = Offset(displayRect.left, displayRect.top),
                            size = Size(displayRect.width, displayRect.height),
                            style = Stroke(width = 1f),
                        )
                    }
                }
            }
        }
    }
}

private fun DrawScope.drawTategakiGlyphs(
    box: MokuroTextBox,
    fitScale: Float,
    fontSizeOverride: Float,
    fontFamily: FontFamily,
    measurer: TextMeasurer,
) {
    val glyphs = TategakiLayout.layout(box, fontSizeOverride, fitScale)
    if (glyphs.isEmpty()) return

    val style = TextStyle(
        fontSize = (glyphs.first().cell / 1.1f).toSp(),
        fontFamily = fontFamily,
        color = Color.Black,
    )

    glyphs.forEach { glyph ->
        val layout = measurer.measure(
            text = AnnotatedString(glyph.text),
            style = style,
        )

        drawText(
            textLayoutResult = layout,
            topLeft = Offset(glyph.x, glyph.y),
        )
    }
}

private fun handlePageTap(
    position: Offset,
    fitScale: Float,
    page: MokuroPage,
    fontSizeOverride: Float,
    onBoxTap: (MokuroTextBox, MokuroTextHit, Offset) -> Unit,
    onPageTap: (Offset) -> Unit,
) {
    val pageX = position.x / fitScale
    val pageY = position.y / fitScale

    val box = page.boxes
        .asReversed()
        .firstOrNull { candidate ->
            pageX >= candidate.rect.left &&
                pageX <= candidate.rect.left + candidate.rect.width &&
                pageY >= candidate.rect.top &&
                pageY <= candidate.rect.top + candidate.rect.height
        }

    if (box != null) {
        val hit = TategakiLayout.locate(
            box = box,
            pageX = pageX,
            pageY = pageY,
            scale = fitScale,
            fontSizeOverride = fontSizeOverride,
        ) ?: MokuroTextHit(0, 0)

        onBoxTap(box, hit, position)
        return
    }

    onPageTap(position)
}
