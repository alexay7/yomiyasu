package es.manabe.yomiyasu.features.downloads

import android.text.format.Formatter
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.PlaylistAdd
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import es.manabe.yomiyasu.components.EmptyBox
import es.manabe.yomiyasu.components.formatNumber
import es.manabe.yomiyasu.core.models.BooksQuery
import es.manabe.yomiyasu.core.models.LibraryVariant
import es.manabe.yomiyasu.core.networking.ApiException
import es.manabe.yomiyasu.core.services.ActiveDownload
import es.manabe.yomiyasu.core.services.DownloadManager
import es.manabe.yomiyasu.core.services.DownloadRecord
import es.manabe.yomiyasu.core.services.LibraryApi
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import javax.inject.Inject

data class DownloadsUiState(
    val active: List<ActiveDownload> = emptyList(),
    val records: List<DownloadRecord> = emptyList(),
    val totalBytes: Long = 0L,
)

@HiltViewModel
class DownloadsViewModel @Inject constructor(
    private val downloads: DownloadManager,
    private val libraryApi: LibraryApi,
) : ViewModel() {

    val uiState: StateFlow<DownloadsUiState> = combine(
        downloads.records,
        downloads.states,
    ) { _, _ -> snapshot() }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = snapshot(),
        )

    private val _seriesDialogVisible = MutableStateFlow(false)
    val seriesDialogVisible: StateFlow<Boolean> = _seriesDialogVisible.asStateFlow()

    private val _seriesBusy = MutableStateFlow(false)
    val seriesBusy: StateFlow<Boolean> = _seriesBusy.asStateFlow()

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message.asStateFlow()

    fun cancel(bookId: String) {
        downloads.cancel(bookId)
    }

    fun delete(bookId: String) {
        downloads.delete(bookId)
    }

    fun openSeriesDialog() {
        _seriesDialogVisible.value = true
    }

    fun dismissSeriesDialog() {
        if (!_seriesBusy.value) {
            _seriesDialogVisible.value = false
        }
    }

    fun clearMessage() {
        _message.value = null
    }

    fun downloadSeries(serieId: String) {
        val trimmed = serieId.trim()
        if (trimmed.isEmpty() || _seriesBusy.value) return

        viewModelScope.launch {
            _seriesBusy.value = true
            try {
                val serie = libraryApi.serieDetail(trimmed)
                val books = libraryApi.books(
                    BooksQuery(variant = LibraryVariant.All, serie = serie.id),
                )

                if (books.isEmpty()) {
                    _message.value = "La serie no tiene libros"
                } else {
                    downloads.enqueueSeries(books)
                    _message.value = if (books.size == 1) {
                        "Añadido 1 libro a la cola"
                    } else {
                        "Añadidos ${books.size} libros a la cola"
                    }
                    _seriesDialogVisible.value = false
                }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Exception) {
                _message.value = (error as? ApiException)?.userMessage
                    ?: error.message
                    ?: "No se pudo cargar la serie"
            } finally {
                _seriesBusy.value = false
            }
        }
    }

    private fun snapshot(): DownloadsUiState = DownloadsUiState(
        active = downloads.active,
        records = downloads.sortedRecords,
        totalBytes = downloads.totalBytes,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DownloadsRoute(
    onOpenBook: (String) -> Unit,
    viewModel: DownloadsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val seriesDialogVisible by viewModel.seriesDialogVisible.collectAsStateWithLifecycle()
    val seriesBusy by viewModel.seriesBusy.collectAsStateWithLifecycle()
    val message by viewModel.message.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(message) {
        message?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearMessage()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Descargas") },
                actions = {
                    IconButton(onClick = viewModel::openSeriesDialog) {
                        Icon(
                            imageVector = Icons.Filled.PlaylistAdd,
                            contentDescription = "Descargar serie",
                        )
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        DownloadsContent(
            state = uiState,
            onCancel = viewModel::cancel,
            onDelete = viewModel::delete,
            onOpenBook = onOpenBook,
            modifier = Modifier.padding(padding),
        )
    }

    if (seriesDialogVisible) {
        SeriesDownloadDialog(
            busy = seriesBusy,
            onConfirm = viewModel::downloadSeries,
            onDismiss = viewModel::dismissSeriesDialog,
        )
    }
}

@Composable
private fun DownloadsContent(
    state: DownloadsUiState,
    onCancel: (String) -> Unit,
    onDelete: (String) -> Unit,
    onOpenBook: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (state.active.isEmpty() && state.records.isEmpty()) {
        EmptyBox(text = "No hay descargas", modifier = modifier)
        return
    }

    val context = LocalContext.current

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .testTag("downloadsList"),
        contentPadding = PaddingValues(vertical = 8.dp),
    ) {
        if (state.active.isNotEmpty()) {
            item(key = "active-header") {
                SectionHeader("Descargas activas")
            }

            items(state.active, key = { "active-${it.bookId}" }) { item ->
                ActiveDownloadRow(item = item, onCancel = { onCancel(item.bookId) })
            }
        }

        if (state.records.isNotEmpty()) {
            item(key = "records-header") {
                SectionHeader("Descargados")
            }

            items(state.records, key = { "record-${it.bookId}" }) { record ->
                DownloadedRow(
                    record = record,
                    sizeText = Formatter.formatShortFileSize(context, record.byteCount),
                    dateText = formatDate(record.downloadedAt),
                    onOpen = { onOpenBook(record.bookId) },
                    onDelete = { onDelete(record.bookId) },
                )
            }

            item(key = "total") {
                Text(
                    text = "Total: ${Formatter.formatShortFileSize(context, state.totalBytes)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                )
            }
        }
    }
}

@Composable
private fun SectionHeader(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 4.dp),
    )
}

@Composable
private fun ActiveDownloadRow(
    item: ActiveDownload,
    onCancel: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = item.name,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )

            if (!item.isQueued) {
                Spacer(modifier = Modifier.height(6.dp))
                LinearProgressIndicator(
                    progress = { item.progress.toFloat() },
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = item.detail,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        IconButton(onClick = onCancel) {
            Icon(
                imageVector = Icons.Filled.Close,
                contentDescription = "Cancelar descarga",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun DownloadedRow(
    record: DownloadRecord,
    sizeText: String,
    dateText: String,
    onOpen: () -> Unit,
    onDelete: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onOpen)
            .padding(start = 16.dp, top = 8.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = record.visibleName,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = recordSubtitle(record, sizeText, dateText),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        IconButton(onClick = onDelete) {
            Icon(
                imageVector = Icons.Filled.Delete,
                contentDescription = "Borrar",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun SeriesDownloadDialog(
    busy: Boolean,
    onConfirm: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    var serieId by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        title = { Text("Descargar serie") },
        text = {
            Column {
                Text("Introduce el identificador de la serie para descargarla completa.")
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = serieId,
                    onValueChange = { serieId = it },
                    label = { Text("Id de la serie") },
                    singleLine = true,
                    enabled = !busy,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Ascii),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onConfirm(serieId) },
                enabled = !busy && serieId.isNotBlank(),
            ) {
                if (busy) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                    )
                } else {
                    Text("Descargar")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !busy) { Text("Cancelar") }
        },
    )
}

private val dateFormatter: DateTimeFormatter =
    DateTimeFormatter.ofPattern("d MMM yyyy, HH:mm", Locale("es", "ES"))

private fun formatDate(epochMillis: Long): String =
    Instant.ofEpochMilli(epochMillis)
        .atZone(ZoneId.systemDefault())
        .format(dateFormatter)

private fun recordSubtitle(record: DownloadRecord, sizeText: String, dateText: String): String {
    val parts = buildList {
        if (record.pageCount > 0) add("${formatNumber(record.pageCount)} páginas")
        add(sizeText)
        add(dateText)
    }
    return parts.joinToString(" · ")
}
