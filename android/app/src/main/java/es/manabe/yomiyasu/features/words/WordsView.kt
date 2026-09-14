package es.manabe.yomiyasu.features.words

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Sort
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
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
import es.manabe.yomiyasu.core.models.UserWord
import es.manabe.yomiyasu.core.models.WordsSort
import es.manabe.yomiyasu.core.networking.ApiException
import es.manabe.yomiyasu.core.services.DictionaryApi
import es.manabe.yomiyasu.core.settings.DictionaryLookupMode
import es.manabe.yomiyasu.features.reader.DictionaryLookupContent
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WordsUiState(
    val words: List<UserWord> = emptyList(),
    val sort: WordsSort = WordsSort.Newest,
    val isLoading: Boolean = true,
    val error: String? = null,
    val deleteError: String? = null,
)

@HiltViewModel
class WordsViewModel @Inject constructor(
    private val dictionaryApi: DictionaryApi,
) : ViewModel() {

    private val _state = MutableStateFlow(WordsUiState())
    val state: StateFlow<WordsUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun setSort(sort: WordsSort) {
        if (_state.value.sort == sort) return
        _state.update { it.copy(sort = sort) }
        load()
    }

    fun refresh() = load()

    fun delete(word: UserWord) {
        viewModelScope.launch {
            try {
                dictionaryApi.deleteWord(word.word)
                _state.update { state ->
                    state.copy(words = state.words.filterNot { it.word == word.word })
                }
            } catch (error: ApiException) {
                _state.update { it.copy(deleteError = error.userMessage) }
            } catch (error: Exception) {
                _state.update { it.copy(deleteError = "No se pudo borrar la palabra.") }
            }
        }
    }

    fun dismissDeleteError() {
        _state.update { it.copy(deleteError = null) }
    }

    private fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val words = dictionaryApi.words(_state.value.sort)
                _state.update { it.copy(words = words, isLoading = false) }
            } catch (error: ApiException) {
                _state.update { it.copy(error = error.userMessage, isLoading = false) }
            } catch (error: Exception) {
                _state.update {
                    it.copy(error = "No se pudieron cargar las palabras.", isLoading = false)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WordsRoute() {
    val viewModel: WordsViewModel = hiltViewModel()
    val state by viewModel.state.collectAsStateWithLifecycle()
    var sortMenuOpen by remember { mutableStateOf(false) }
    var selectedWord by remember { mutableStateOf<UserWord?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Palabras") },
                actions = {
                    IconButton(onClick = viewModel::refresh) {
                        Icon(
                            imageVector = Icons.Filled.Refresh,
                            contentDescription = "Actualizar",
                        )
                    }

                    Box {
                        IconButton(onClick = { sortMenuOpen = true }) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.Sort,
                                contentDescription = "Ordenar",
                            )
                        }

                        DropdownMenu(
                            expanded = sortMenuOpen,
                            onDismissRequest = { sortMenuOpen = false },
                        ) {
                            WordsSort.entries.forEach { option ->
                                DropdownMenuItem(
                                    text = { Text(option.title) },
                                    onClick = {
                                        sortMenuOpen = false
                                        viewModel.setSort(option)
                                    },
                                )
                            }
                        }
                    }
                },
            )
        },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            val error = state.error
            when {
                state.isLoading && state.words.isEmpty() -> LoadingBox()

                error != null && state.words.isEmpty() ->
                    ErrorBox(message = error, onRetry = viewModel::refresh)

                state.words.isEmpty() -> EmptyBox(
                    "No tienes palabras guardadas. Guarda palabras desde el lector para repasarlas aquí.",
                )

                else -> LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .testTag("wordsList"),
                ) {
                    itemsIndexed(items = state.words, key = { _, word -> word.word }) { index, word ->
                        WordsRow(
                            word = word,
                            onOpen = { selectedWord = word },
                            onDelete = { viewModel.delete(word) },
                        )

                        if (index < state.words.size - 1) {
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                        }
                    }
                }
            }
        }
    }

    state.deleteError?.let { message ->
        AlertDialog(
            onDismissRequest = viewModel::dismissDeleteError,
            title = { Text("No se pudo borrar") },
            text = { Text(message) },
            confirmButton = {
                TextButton(onClick = viewModel::dismissDeleteError) { Text("Aceptar") }
            },
        )
    }

    selectedWord?.let { word ->
        ModalBottomSheet(
            onDismissRequest = { selectedWord = null },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        ) {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "Diccionario",
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                )

                DictionaryLookupContent(
                    query = word.word,
                    mode = DictionaryLookupMode.Word,
                    sentence = word.sentence.takeIf { it.isNotEmpty() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 560.dp),
                )
            }
        }
    }
}

@Composable
private fun WordsRow(
    word: UserWord,
    onOpen: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val scope = rememberCoroutineScope()
    val dismissState = rememberSwipeToDismissBoxState()
    var confirmDelete by remember { mutableStateOf(false) }

    SwipeToDismissBox(
        state = dismissState,
        modifier = modifier,
        enableDismissFromStartToEnd = false,
        onDismiss = { confirmDelete = true },
        backgroundContent = {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.errorContainer)
                    .padding(horizontal = 24.dp),
                contentAlignment = Alignment.CenterEnd,
            ) {
                Icon(
                    imageVector = Icons.Filled.Delete,
                    contentDescription = "Borrar",
                    tint = MaterialTheme.colorScheme.onErrorContainer,
                )
            }
        },
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surface)
                .clickable(onClick = onOpen)
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Bottom,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    if (word.reading.isNotEmpty() && word.reading != word.word) {
                        Text(
                            text = word.reading,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }

                    Text(
                        text = word.word,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                }

                Text(
                    text = word.frequencyLabel,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            if (word.pitch.isNotEmpty()) {
                PitchAccentView(reading = word.reading, pitchPositions = word.pitch)
            }

            if (word.meaning.isNotEmpty()) {
                Text(
                    text = word.meaning.joinToString("; "),
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            if (word.sentence.isNotEmpty()) {
                Text(
                    text = highlightedSentence(
                        sentence = word.sentence,
                        token = word.display.ifEmpty { word.word },
                    ),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = {
                confirmDelete = false
                scope.launch { dismissState.reset() }
            },
            title = { Text("¿Borrar «${word.word}»?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        confirmDelete = false
                        onDelete()
                    },
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = MaterialTheme.colorScheme.error,
                    ),
                ) { Text("Borrar") }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        confirmDelete = false
                        scope.launch { dismissState.reset() }
                    },
                ) { Text("Cancelar") }
            },
        )
    }
}

@Composable
private fun highlightedSentence(sentence: String, token: String): AnnotatedString {
    if (token.isEmpty()) return AnnotatedString(sentence)

    val index = sentence.indexOf(token)
    if (index < 0) return AnnotatedString(sentence)

    val highlight = MaterialTheme.colorScheme.primary

    return buildAnnotatedString {
        append(sentence.substring(0, index))
        withStyle(SpanStyle(color = highlight, fontWeight = FontWeight.Bold)) {
            append(sentence.substring(index, index + token.length))
        }
        append(sentence.substring(index + token.length))
    }
}
