package es.manabe.yomiyasu.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import es.manabe.yomiyasu.core.models.JapaneseMorae

@Composable
fun PitchAccentView(
    reading: String,
    pitchPositions: List<Int>,
    modifier: Modifier = Modifier,
) {
    val morae = JapaneseMorae.split(reading)
    val accent = pitchPositions.firstOrNull() ?: 0
    val pattern = JapaneseMorae.accentPattern(morae.size, accent)

    Row(
        modifier = modifier.semantics {
            contentDescription = "Acento tonal ${pitchPositions.joinToString(", ")}, $reading"
        },
        verticalAlignment = Alignment.Top,
    ) {
        morae.forEachIndexed { index, mora ->
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .padding(horizontal = 1.dp)
                        .size(width = 18.dp, height = 2.dp)
                        .background(
                            if (index < pattern.size && pattern[index]) {
                                MaterialTheme.colorScheme.onSurface
                            } else {
                                androidx.compose.ui.graphics.Color.Transparent
                            },
                        ),
                )
                Text(
                    text = mora,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(horizontal = 1.dp),
                )
            }
        }

        if (pitchPositions.isNotEmpty()) {
            Text(
                text = "[${pitchPositions.joinToString(",")}]",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 6.dp, top = 2.dp),
            )
        }
    }
}
