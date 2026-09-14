package es.manabe.yomiyasu.features.reader

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import es.manabe.yomiyasu.components.EmptyBox
import es.manabe.yomiyasu.components.ErrorBox
import es.manabe.yomiyasu.components.LoadingBox
import es.manabe.yomiyasu.components.PitchAccentView
import es.manabe.yomiyasu.components.formatNumber
import es.manabe.yomiyasu.core.models.DictionaryDisplay
import es.manabe.yomiyasu.core.models.DictionaryWord
import es.manabe.yomiyasu.core.models.UserWordRequest
import es.manabe.yomiyasu.core.networking.ApiException
import es.manabe.yomiyasu.core.services.DictionaryApi
import es.manabe.yomiyasu.core.settings.DictionaryLookupMode
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface DictionaryLookupSaveAlert {
    data object Saved : DictionaryLookupSaveAlert
    data object Duplicate : DictionaryLookupSaveAlert
    data class Failure(val message: String) : DictionaryLookupSaveAlert
}

data class DictionaryLookupUiState(
    val displays: List<DictionaryDisplay> = emptyList(),
    val selectedIndex: Int = 0,
    val isLoading: Boolean = true,
    val error: String? = null,
    val savedWordID: String? = null,
    val alert: DictionaryLookupSaveAlert? = null,
)

@HiltViewModel
class DictionaryLookupViewModel @Inject constructor(
    private val dictionaryApi: DictionaryApi,
) : ViewModel() {

    private val _state = MutableStateFlow(DictionaryLookupUiState())
    val state: StateFlow<DictionaryLookupUiState> = _state.asStateFlow()

    private var query: String = ""
    private var mode: DictionaryLookupMode = DictionaryLookupMode.Word
    private var sentence: String? = null
    private var initialized = false

    fun init(query: String, mode: DictionaryLookupMode, sentence: String?) {
        if (initialized) return
        initialized = true
        this.query = query
        this.mode = mode
        this.sentence = sentence
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }

            try {
                val displays = when (mode) {
                    DictionaryLookupMode.Word -> dictionaryApi.lookupWord(query)
                    DictionaryLookupMode.Sentence -> dictionaryApi.lookupSentence(query)
                }
                _state.update {
                    it.copy(displays = displays, selectedIndex = 0, isLoading = false)
                }
            } catch (error: ApiException) {
                _state.update {
                    it.copy(displays = emptyList(), error = error.userMessage, isLoading = false)
                }
            } catch (error: Exception) {
                _state.update {
                    it.copy(
                        displays = emptyList(),
                        error = "No se pudo consultar el diccionario.",
                        isLoading = false,
                    )
                }
            }
        }
    }

    fun select(index: Int) {
        _state.update { it.copy(selectedIndex = index) }
    }

    fun save(word: DictionaryWord, display: DictionaryDisplay) {
        viewModelScope.launch {
            try {
                val modified = dictionaryApi.saveWord(
                    UserWordRequest(
                        word = word.headword,
                        display = display.display ?: query,
                        sentence = sentence ?: "",
                        meaning = word.firstGlosses,
                        reading = word.mainReading,
                        frequency = word.frequencyRank?.toDouble() ?: 0.0,
                        pitch = word.pitchPositions,
                    ),
                )

                _state.update {
                    it.copy(
                        savedWordID = word.id,
                        alert = if (modified == 0) {
                            DictionaryLookupSaveAlert.Duplicate
                        } else {
                            DictionaryLookupSaveAlert.Saved
                        },
                    )
                }
            } catch (error: ApiException) {
                _state.update {
                    it.copy(alert = DictionaryLookupSaveAlert.Failure(error.userMessage))
                }
            } catch (error: Exception) {
                _state.update {
                    it.copy(
                        alert = DictionaryLookupSaveAlert.Failure("No se pudo guardar la palabra."),
                    )
                }
            }
        }
    }

    fun dismissAlert() {
        _state.update { it.copy(alert = null) }
    }
}

@Composable
fun DictionaryLookupContent(
    query: String,
    mode: DictionaryLookupMode,
    sentence: String? = null,
    modifier: Modifier = Modifier,
) {
    val viewModel: DictionaryLookupViewModel = hiltViewModel(key = "dict-$query-${mode.name}")
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(query, mode, sentence) {
        viewModel.init(query, mode, sentence)
    }

    val error = state.error
    when {
        state.isLoading -> LoadingBox(modifier = modifier)

        error != null -> ErrorBox(
            message = error,
            modifier = modifier,
            onRetry = viewModel::load,
        )

        state.displays.isEmpty() -> EmptyBox(
            text = "No se encontraron definiciones.",
            modifier = modifier,
        )

        else -> DictionaryResults(
            displays = state.displays,
            selectedIndex = state.selectedIndex,
            sentence = sentence,
            savedWordID = state.savedWordID,
            onSelect = viewModel::select,
            onSave = viewModel::save,
            modifier = modifier.fillMaxSize(),
        )
    }

    state.alert?.let { alert ->
        DictionarySaveAlertDialog(alert = alert, onDismiss = viewModel::dismissAlert)
    }
}

@Composable
private fun DictionaryResults(
    displays: List<DictionaryDisplay>,
    selectedIndex: Int,
    sentence: String?,
    savedWordID: String?,
    onSelect: (Int) -> Unit,
    onSave: (DictionaryWord, DictionaryDisplay) -> Unit,
    modifier: Modifier = Modifier,
) {
    val display = displays[selectedIndex.coerceIn(0, displays.lastIndex)]

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
            .testTag("dictionaryResults"),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        if (displays.size > 1) {
            SingleChoiceSegmentedButtonRow(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
            ) {
                displays.forEachIndexed { index, item ->
                    SegmentedButton(
                        selected = index == selectedIndex,
                        onClick = { onSelect(index) },
                        shape = SegmentedButtonDefaults.itemShape(
                            index = index,
                            count = displays.size,
                        ),
                    ) {
                        Text(
                            text = item.display ?: "?",
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
        }

        if (!sentence.isNullOrEmpty()) {
            ContextSentence(sentence = sentence, token = display.display)
        }

        display.words.forEach { word ->
            DictionaryWordCard(
                word = word,
                saved = savedWordID == word.id,
                onSave = { onSave(word, display) },
            )
        }
    }
}

@Composable
private fun ContextSentence(sentence: String, token: String?) {
    Text(
        text = highlightedText(text = sentence, token = token),
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier
            .fillMaxWidth()
            .background(
                color = MaterialTheme.colorScheme.surfaceContainerHigh,
                shape = RoundedCornerShape(10.dp),
            )
            .padding(10.dp),
    )
}

@Composable
private fun DictionaryWordCard(
    word: DictionaryWord,
    saved: Boolean,
    onSave: () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Box(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(end = 48.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.Bottom,
                ) {
                    Text(
                        text = word.headword,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )

                    if (word.mainReading.isNotEmpty() && word.mainReading != word.headword) {
                        Text(
                            text = word.mainReading,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(bottom = 2.dp),
                        )
                    }
                }

                IconButton(
                    onClick = onSave,
                    enabled = !saved,
                    modifier = Modifier.align(Alignment.TopEnd),
                ) {
                    Icon(
                        imageVector = if (saved) {
                            Icons.Filled.CheckCircle
                        } else {
                            Icons.Filled.Bookmark
                        },
                        contentDescription = if (saved) "Guardada" else "Guardar palabra",
                        tint = if (saved) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        },
                    )
                }
            }

            val otherKanji = word.kanji?.drop(1)?.map { it.text }.orEmpty()
            if (otherKanji.isNotEmpty()) {
                Text(
                    text = "Otras formas: ${otherKanji.joinToString(", ")}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            val otherKana = word.kana?.drop(1)?.map { it.text }.orEmpty()
            if (otherKana.isNotEmpty()) {
                Text(
                    text = "Lecturas: ${otherKana.joinToString(", ")}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            if (word.pitchPositions.isNotEmpty() || word.frequencyRank != null) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (word.pitchPositions.isNotEmpty()) {
                        PitchAccentView(
                            reading = word.mainReading,
                            pitchPositions = word.pitchPositions,
                        )
                    }

                    word.frequencyRank?.let { rank ->
                        Text(
                            text = "Frecuencia: ${formatNumber(rank)}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            word.sense.orEmpty().take(3).forEachIndexed { index, sense ->
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        text = "${index + 1}. " + sense.gloss.orEmpty()
                            .map { it.text }
                            .joinToString("; "),
                        style = MaterialTheme.typography.bodyMedium,
                    )

                    val partOfSpeech = sense.partOfSpeech.orEmpty()
                    if (partOfSpeech.isNotEmpty()) {
                        Text(
                            text = partOfSpeech.joinToString(", "),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DictionarySaveAlertDialog(
    alert: DictionaryLookupSaveAlert,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                when (alert) {
                    DictionaryLookupSaveAlert.Saved -> "Palabra guardada"
                    DictionaryLookupSaveAlert.Duplicate -> "Ya guardada"
                    is DictionaryLookupSaveAlert.Failure -> "No se pudo guardar"
                },
            )
        },
        text = {
            when (alert) {
                DictionaryLookupSaveAlert.Saved -> Text("La palabra se ha añadido a tu lista.")
                DictionaryLookupSaveAlert.Duplicate -> Text("Ya tienes esta palabra guardada.")
                is DictionaryLookupSaveAlert.Failure -> Text(alert.message)
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("Aceptar") }
        },
    )
}

@Composable
private fun highlightedText(text: String, token: String?): AnnotatedString {
    if (token.isNullOrEmpty()) return AnnotatedString(text)

    val index = text.indexOf(token)
    if (index < 0) return AnnotatedString(text)

    val highlight = MaterialTheme.colorScheme.primary

    return buildAnnotatedString {
        append(text.substring(0, index))
        withStyle(SpanStyle(color = highlight, fontWeight = FontWeight.Bold)) {
            append(text.substring(index, index + token.length))
        }
        append(text.substring(index + token.length))
    }
}
