package es.manabe.yomiyasu.features.reader

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import es.manabe.yomiyasu.core.mokuro.MokuroPage

@Composable
fun PageTextSheet(
    pages: List<MokuroPage>,
    onOpenDictionary: (String) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(max = 600.dp)
            .testTag("pageTextSheet"),
    ) {
        Text(
            text = "Texto de la página",
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
        )

        LazyColumn(
            modifier = Modifier.fillMaxWidth(),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(
                start = 20.dp,
                end = 20.dp,
                bottom = 24.dp,
            ),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            pages.forEachIndexed { pageIndex, page ->
                if (pages.size > 1) {
                    item(key = "page-${page.id}") {
                        Text(
                            text = "Página ${page.id + 1}",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }

                items(page.boxes.size) { boxIndex ->
                    val box = page.boxes[boxIndex]
                    box.paragraphs.forEach { paragraph ->
                        Text(
                            text = paragraph.text,
                            style = MaterialTheme.typography.bodyLarge,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onOpenDictionary(paragraph.text) }
                                .padding(vertical = 4.dp)
                                .testTag("pageTextParagraph"),
                        )
                    }
                }
            }
        }
    }
}
