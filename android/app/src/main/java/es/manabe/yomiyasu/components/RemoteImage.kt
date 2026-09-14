package es.manabe.yomiyasu.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage

@Composable
fun RemoteImage(
    url: String?,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop,
    blurred: Boolean = false,
) {
    AsyncImage(
        model = url,
        contentDescription = contentDescription,
        modifier = if (blurred) modifier.blur(10.dp) else modifier,
        contentScale = contentScale,
    )
}
