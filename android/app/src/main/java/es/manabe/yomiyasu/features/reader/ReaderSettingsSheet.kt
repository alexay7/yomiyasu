package es.manabe.yomiyasu.features.reader

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import es.manabe.yomiyasu.core.settings.DictionaryLookupMode
import es.manabe.yomiyasu.core.settings.NovelFont
import es.manabe.yomiyasu.core.settings.NovelTheme
import es.manabe.yomiyasu.core.settings.NovelWritingMode
import es.manabe.yomiyasu.core.settings.ReaderFont
import es.manabe.yomiyasu.core.settings.ReaderSettings
import es.manabe.yomiyasu.core.settings.ReaderSettingsData
import es.manabe.yomiyasu.core.settings.ZoomMode
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ReaderSettingsViewModel @Inject constructor(
    private val settings: ReaderSettings,
) : ViewModel() {

    val data: StateFlow<ReaderSettingsData> = settings.flow

    fun update(transform: (ReaderSettingsData) -> ReaderSettingsData) {
        viewModelScope.launch { settings.update(transform) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReaderSettingsSheet(
    viewModel: ReaderSettingsViewModel = hiltViewModel(),
) {
    val settings by viewModel.data.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(max = 640.dp)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp)
            .padding(bottom = 24.dp)
            .testTag("readerSettings"),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text("Ajustes del lector", style = MaterialTheme.typography.titleLarge)

        Text("Navegación", style = MaterialTheme.typography.titleSmall)
        SwitchRow(
            label = "Leer de derecha a izquierda",
            checked = settings.r2l,
            onChange = { value -> viewModel.update { it.copy(r2l = value) } },
        )
        SwitchRow(
            label = "Doble página",
            checked = settings.doublePage,
            onChange = { value -> viewModel.update { it.copy(doublePage = value) } },
        )
        SwitchRow(
            label = "La primera página es portada",
            checked = settings.hasCover,
            onChange = { value -> viewModel.update { it.copy(hasCover = value) } },
        )
        SwitchRow(
            label = "Pasar página con deslizamiento",
            checked = settings.scrollChange,
            onChange = { value -> viewModel.update { it.copy(scrollChange = value) } },
        )

        Text("Zoom", style = MaterialTheme.typography.titleSmall)
        ChipRow(
            options = ZoomMode.entries.map { it.title },
            selectedIndex = ZoomMode.entries.indexOf(settings.defaultZoomMode),
            onSelect = { index -> viewModel.update { it.copy(defaultZoomMode = ZoomMode.entries[index]) } },
        )
        SwitchRow(
            label = "Pan y zoom",
            checked = settings.panAndZoom,
            onChange = { value -> viewModel.update { it.copy(panAndZoom = value) } },
        )

        Text("Texto OCR", style = MaterialTheme.typography.titleSmall)
        SwitchRow(
            label = "Mostrar texto OCR siempre",
            checked = settings.displayOCR,
            onChange = { value -> viewModel.update { it.copy(displayOCR = value) } },
        )
        SwitchRow(
            label = "Bordes de las cajas de texto",
            checked = settings.textBoxBorders,
            onChange = { value -> viewModel.update { it.copy(textBoxBorders = value) } },
        )
        SwitchRow(
            label = "Tocar cajas para texto/diccionario",
            checked = settings.toggleOCRTextBoxes,
            onChange = { value -> viewModel.update { it.copy(toggleOCRTextBoxes = value) } },
        )

        Text(
            "Tamaño de letra: ${if (settings.fontSize == 0.0) "Automático" else settings.fontSize.toInt().toString()}",
            style = MaterialTheme.typography.labelMedium,
        )
        Slider(
            value = settings.fontSize.toFloat(),
            onValueChange = { value -> viewModel.update { it.copy(fontSize = value.toDouble()) } },
            valueRange = 0f..72f,
        )

        Text("Fuente", style = MaterialTheme.typography.titleSmall)
        ChipRow(
            options = ReaderFont.entries.map { it.title },
            selectedIndex = ReaderFont.entries.indexOf(settings.font),
            onSelect = { index -> viewModel.update { it.copy(font = ReaderFont.entries[index]) } },
        )

        Text("Diccionario", style = MaterialTheme.typography.titleSmall)
        SwitchRow(
            label = "Diccionario nativo",
            checked = settings.nativeDictionary,
            onChange = { value -> viewModel.update { it.copy(nativeDictionary = value) } },
        )
        ChipRow(
            options = DictionaryLookupMode.entries.map { it.title },
            selectedIndex = DictionaryLookupMode.entries.indexOf(settings.dictionaryVersion),
            onSelect = { index ->
                viewModel.update { it.copy(dictionaryVersion = DictionaryLookupMode.entries[index]) }
            },
        )

        Text("Novelas", style = MaterialTheme.typography.titleSmall)
        ChipRow(
            options = NovelWritingMode.entries.map { it.title },
            selectedIndex = NovelWritingMode.entries.indexOf(settings.novelWritingMode),
            onSelect = { index ->
                viewModel.update { it.copy(novelWritingMode = NovelWritingMode.entries[index]) }
            },
        )
        ChipRow(
            options = NovelTheme.entries.map { it.title },
            selectedIndex = NovelTheme.entries.indexOf(settings.novelTheme),
            onSelect = { index -> viewModel.update { it.copy(novelTheme = NovelTheme.entries[index]) } },
        )
        ChipRow(
            options = NovelFont.entries.map { it.title },
            selectedIndex = NovelFont.entries.indexOf(settings.novelFont),
            onSelect = { index -> viewModel.update { it.copy(novelFont = NovelFont.entries[index]) } },
        )
        Text(
            "Tamaño de letra: ${settings.novelFontSize.toInt()} %",
            style = MaterialTheme.typography.labelMedium,
        )
        Slider(
            value = settings.novelFontSize.toFloat(),
            onValueChange = { value -> viewModel.update { it.copy(novelFontSize = value.toDouble()) } },
            valueRange = 50f..200f,
        )
        SwitchRow(
            label = "Desplazamiento continuo",
            checked = settings.novelScroll,
            onChange = { value -> viewModel.update { it.copy(novelScroll = value) } },
        )
    }
}

@Composable
private fun SwitchRow(
    label: String,
    checked: Boolean,
    onChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium)
        Switch(checked = checked, onCheckedChange = onChange)
    }
}

@Composable
private fun ChipRow(
    options: List<String>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        options.forEachIndexed { index, option ->
            FilterChip(
                selected = index == selectedIndex,
                onClick = { onSelect(index) },
                label = { Text(option, style = MaterialTheme.typography.labelSmall) },
            )
        }
    }
}
