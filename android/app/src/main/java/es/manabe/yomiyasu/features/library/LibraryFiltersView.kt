package es.manabe.yomiyasu.features.library

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RangeSlider
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import es.manabe.yomiyasu.core.models.ProgressFilter
import es.manabe.yomiyasu.core.models.SerieStatus
import es.manabe.yomiyasu.core.models.SeriesQuery
import es.manabe.yomiyasu.core.models.SortValue

private data class SortOption(val label: String, val value: SortValue)

private val sortOptions = listOf(
    SortOption("Título (A-Z)", SortValue("sortName", false)),
    SortOption("Título (Z-A)", SortValue("sortName", true)),
    SortOption("Añadidos recientemente", SortValue("_id", true)),
    SortOption("Añadidos hace más tiempo", SortValue("_id", false)),
    SortOption("Modificados recientemente", SortValue("lastModifiedDate", true)),
    SortOption("Más volúmenes", SortValue("bookCount", true)),
    SortOption("Menos volúmenes", SortValue("bookCount", false)),
    SortOption("Dificultad (menor a mayor)", SortValue("difficulty", false)),
    SortOption("Dificultad (mayor a menor)", SortValue("difficulty", true)),
    SortOption("Mejor valoradas", SortValue("valoration", true)),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryFiltersContent(
    query: SeriesQuery,
    genres: List<String>,
    authors: List<String>,
    onApply: (SeriesQuery) -> Unit,
    onDismiss: () -> Unit,
) {
    var draft by remember { mutableStateOf(query) }
    var minDifficulty by rememberSaveable { mutableFloatStateOf((query.minDifficulty ?: 0).toFloat()) }
    var maxDifficulty by rememberSaveable { mutableFloatStateOf((query.maxDifficulty ?: 10).toFloat()) }
    var minValoration by rememberSaveable { mutableFloatStateOf((query.minValoration ?: 0).toFloat()) }
    var maxValoration by rememberSaveable { mutableFloatStateOf((query.maxValoration ?: 10).toFloat()) }
    var valorationCountText by rememberSaveable {
        mutableStateOf((query.valorationCount ?: 0).takeIf { it > 0 }?.toString() ?: "")
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp)
            .padding(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text("Filtros", style = MaterialTheme.typography.titleLarge)

        DropdownField(
            label = "Ordenar por",
            value = sortOptions.firstOrNull { it.value == draft.sort }?.label
                ?: sortOptions.first().label,
            options = sortOptions.map { it.label },
            onSelect = { index -> draft = draft.copy(sort = sortOptions[index].value) },
        )

        Text("Estado", style = MaterialTheme.typography.titleSmall)
        SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
            val options = listOf<SerieStatus?>(null) + SerieStatus.entries
            options.forEachIndexed { index, status ->
                SegmentedButton(
                    selected = draft.status == status,
                    onClick = { draft = draft.copy(status = status) },
                    shape = SegmentedButtonDefaults.itemShape(index, options.size),
                ) {
                    Text(status?.title ?: "Todas")
                }
            }
        }

        Text(
            "Dificultad: ${minDifficulty.toInt()} – ${maxDifficulty.toInt()}",
            style = MaterialTheme.typography.titleSmall,
        )
        RangeSlider(
            value = minDifficulty..maxDifficulty,
            onValueChange = { range ->
                minDifficulty = range.start
                maxDifficulty = range.endInclusive
            },
            valueRange = 0f..10f,
            steps = 9,
        )

        Text(
            "Valoración: ${minValoration.toInt()} – ${maxValoration.toInt()}",
            style = MaterialTheme.typography.titleSmall,
        )
        RangeSlider(
            value = minValoration..maxValoration,
            onValueChange = { range ->
                minValoration = range.start
                maxValoration = range.endInclusive
            },
            valueRange = 0f..10f,
            steps = 9,
        )

        OutlinedTextField(
            value = valorationCountText,
            onValueChange = { text -> valorationCountText = text.filter { it.isDigit() } },
            label = { Text("Nº mínimo de valoraciones") },
            placeholder = { Text("Cualquiera") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        DropdownField(
            label = "Género",
            value = draft.genre ?: "Cualquiera",
            options = listOf("Cualquiera") + genres,
            onSelect = { index -> draft = draft.copy(genre = if (index == 0) null else genres[index - 1]) },
        )

        DropdownField(
            label = "Autor",
            value = draft.author ?: "Cualquiera",
            options = listOf("Cualquiera") + authors,
            onSelect = { index -> draft = draft.copy(author = if (index == 0) null else authors[index - 1]) },
        )

        Text("Progreso", style = MaterialTheme.typography.titleSmall)
        SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
            ProgressFilter.entries.forEachIndexed { index, filter ->
                SegmentedButton(
                    selected = (draft.readprogress ?: ProgressFilter.All) == filter,
                    onClick = {
                        draft = draft.copy(
                            readprogress = if (filter == ProgressFilter.All) null else filter,
                        )
                    },
                    shape = SegmentedButtonDefaults.itemShape(index, ProgressFilter.entries.size),
                ) {
                    Text(filter.title)
                }
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Solo series en mi lista")
            Switch(
                checked = draft.readlistOnly,
                onCheckedChange = { draft = draft.copy(readlistOnly = it) },
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            TextButton(
                onClick = {
                    draft = draft.resetFilters()
                    minDifficulty = 0f
                    maxDifficulty = 10f
                    minValoration = 0f
                    maxValoration = 10f
                    valorationCountText = ""
                },
            ) {
                Text("Restablecer filtros", color = MaterialTheme.colorScheme.error)
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = onDismiss) { Text("Cancelar") }
                Button(
                    onClick = {
                        val min = minDifficulty.toInt()
                        val max = maxDifficulty.toInt().coerceAtLeast(min)
                        val minVal = minValoration.toInt()
                        val maxVal = maxValoration.toInt().coerceAtLeast(minVal)
                        onApply(
                            draft.copy(
                                minDifficulty = if (min > 0) min else null,
                                maxDifficulty = if (max < 10) max else null,
                                minValoration = if (minVal > 0) minVal else null,
                                maxValoration = if (maxVal < 10) maxVal else null,
                                valorationCount = valorationCountText.toIntOrNull()?.takeIf { it > 0 },
                            ),
                        )
                    },
                ) {
                    Text("Aplicar")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DropdownField(
    label: String,
    value: String,
    options: List<String>,
    onSelect: (Int) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it },
    ) {
        OutlinedTextField(
            value = value,
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier
                .menuAnchor(androidx.compose.material3.MenuAnchorType.PrimaryNotEditable)
                .fillMaxWidth(),
        )

        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEachIndexed { index, option ->
                DropdownMenuItem(
                    text = { Text(option) },
                    onClick = {
                        expanded = false
                        onSelect(index)
                    },
                )
            }
        }
    }
}
