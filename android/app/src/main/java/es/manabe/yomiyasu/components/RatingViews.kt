package es.manabe.yomiyasu.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material.icons.filled.StarHalf
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import es.manabe.yomiyasu.app.ui.theme.DifficultyColors

fun difficultyColor(difficulty: Double): Color? =
    if (difficulty <= 0.0) {
        null
    } else {
        val index = difficulty.toInt().coerceIn(0, DifficultyColors.size - 1)
        DifficultyColors[index]
    }

@Composable
fun DifficultyFlame(
    difficulty: Double?,
    modifier: Modifier = Modifier,
    size: Int = 14,
) {
    val value = difficulty ?: 0.0
    val tint = difficultyColor(value) ?: MaterialTheme.colorScheme.onSurfaceVariant
    val label = if (value > 0) {
        "Dificultad ${String.format("%.1f", value)}"
    } else {
        "Sin dificultad"
    }

    Icon(
        imageVector = Icons.Filled.LocalFireDepartment,
        contentDescription = label,
        tint = tint,
        modifier = modifier.size(size.dp),
    )
}

@Composable
fun StarRating(
    valoration: Double?,
    modifier: Modifier = Modifier,
    starSize: Int = 12,
) {
    val value = valoration ?: 0.0
    if (value <= 0.0) return

    val stars = value / 2

    Row(
        modifier = modifier.semantics {
            contentDescription = "Valoración ${String.format("%.1f", value)} de 10"
        },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        for (index in 0 until 5) {
            val threshold = index.toDouble()
            val icon = when {
                stars >= threshold + 1 -> Icons.Filled.Star
                stars >= threshold + 0.5 -> Icons.Filled.StarHalf
                else -> Icons.Filled.StarBorder
            }
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = Color(0xFFFFC107),
                modifier = Modifier.size(starSize.dp),
            )
        }
    }
}
