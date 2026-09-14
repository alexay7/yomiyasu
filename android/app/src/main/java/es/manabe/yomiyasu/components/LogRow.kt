package es.manabe.yomiyasu.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import es.manabe.yomiyasu.core.models.ProgressRecord
import es.manabe.yomiyasu.core.models.ProgressStatus
import es.manabe.yomiyasu.core.models.Variant
import es.manabe.yomiyasu.core.networking.IsoDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private val spanishLocale: Locale = Locale("es", "ES")
private val logDateFormatter: DateTimeFormatter =
    DateTimeFormatter.ofPattern("d MMM y, H:mm", spanishLocale)

fun formatLogDate(value: String?): String? {
    val instant = IsoDate.parse(value) ?: return null
    return logDateFormatter.format(instant.atZone(ZoneId.systemDefault()))
}

@Composable
fun LogRow(
    record: ProgressRecord,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.padding(vertical = 2.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            text = record.bookName,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Bold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )

        if (record.serieName.isNotEmpty()) {
            Text(
                text = record.serieName,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            formatLogDate(record.lastUpdateDate)?.let { date ->
                LogDetailText(date)
            }

            record.time?.takeIf { it > 0 }?.let { time ->
                LogDetailText(durationText(time))
            }

            when (record.resolvedVariant) {
                Variant.Manga -> LogDetailText("pág. ${record.currentPage ?: 1}")

                Variant.Novela -> record.characters?.takeIf { it > 0 }?.let { characters ->
                    LogDetailText("${formatNumber(characters)} car.")
                }
            }

            record.status?.let { status ->
                Text(
                    text = status.title,
                    style = MaterialTheme.typography.labelSmall,
                    color = if (status == ProgressStatus.Completed) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
                )
            }
        }
    }
}

@Composable
private fun LogDetailText(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}
