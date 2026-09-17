package es.manabe.yomiyasu.features.reader

import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import coil3.compose.AsyncImage
import es.manabe.yomiyasu.core.mokuro.MokuroPage
import es.manabe.yomiyasu.core.settings.ZoomMode

/**
 * Página de un tomo sin mokuro: solo la imagen, sin overlay de OCR ni
 * hit-testing de cajas. Los toques se delegan al pager (zonas de página).
 */
@Composable
fun ImagePageView(
    page: MokuroPage,
    imageModel: Any?,
    fitMode: ZoomMode,
    onPageTap: (Offset) -> Unit,
    modifier: Modifier = Modifier,
    /** Proporción (ancho/alto) real de la imagen una vez decodificada. */
    onIntrinsicSize: ((Float) -> Unit)? = null,
) {
    val contentScale = when (fitMode) {
        ZoomMode.FitWidth -> ContentScale.FillWidth
        ZoomMode.Original -> ContentScale.None
        else -> ContentScale.Fit
    }

    // El gesto se registra una sola vez: rememberUpdatedState evita que el
    // handler quede con el zoom/estado del primer composition.
    val currentOnPageTap by rememberUpdatedState(onPageTap)

    Box(
        modifier = modifier.pointerInput(page.id) {
            detectTapGestures { position -> currentOnPageTap(position) }
        },
        contentAlignment = Alignment.Center,
    ) {
        AsyncImage(
            model = imageModel,
            contentDescription = page.imagePath,
            contentScale = contentScale,
            onSuccess = { state ->
                val size = state.painter.intrinsicSize
                if (size.width > 0f && size.height > 0f) {
                    onIntrinsicSize?.invoke(size.width / size.height)
                }
            },
            modifier = Modifier.fillMaxSize(),
        )
    }
}
