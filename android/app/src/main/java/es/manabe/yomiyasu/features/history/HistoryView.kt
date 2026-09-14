package es.manabe.yomiyasu.features.history

import android.content.Intent
import androidx.activity.compose.LocalOnBackPressedDispatcherOwner
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.SwapVert
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import es.manabe.yomiyasu.components.EmptyBox
import es.manabe.yomiyasu.components.ErrorBox
import es.manabe.yomiyasu.components.LoadingBox
import es.manabe.yomiyasu.components.LogRow
import es.manabe.yomiyasu.core.models.ProgressRecord
import es.manabe.yomiyasu.core.networking.ApiException
import es.manabe.yomiyasu.core.services.ProgressApi
import es.manabe.yomiyasu.core.services.SocketService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val progress: ProgressApi,
    socket: SocketService,
) : ViewModel() {

    enum class Sort(val rawValue: String, val title: String) {
        Recent("!lastUpdateDate", "Recientes"),
        Oldest("lastUpdateDate", "Más antiguos"),
        ByBook("book", "Por libro"),
        BySerie("serie", "Por serie"),
    }

    data class UiState(
        val records: List<ProgressRecord> = emptyList(),
        val total: Int = 0,
        val isLoading: Boolean = true,
        val isLoadingMore: Boolean = false,
        val sort: Sort = Sort.Recent,
        val error: String? = null,
    ) {
        val canLoadMore: Boolean get() = records.size < total
    }

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    val libraryUpdatedAt: StateFlow<Long?> = socket.libraryUpdatedAt

    private var page = 1

    init {
        load(reset = true)
    }

    fun selectSort(sort: Sort) {
        if (sort == _state.value.sort) return
        _state.update {
            it.copy(sort = sort, records = emptyList(), total = 0, error = null)
        }
        load(reset = true)
    }

    fun refresh() {
        load(reset = true)
    }

    fun loadMore() {
        val current = _state.value
        if (current.isLoading || current.isLoadingMore || !current.canLoadMore) return
        load(reset = false)
    }

    private fun load(reset: Boolean) {
        viewModelScope.launch {
            if (reset) {
                page = 1
                _state.update { it.copy(isLoading = true, error = null) }
            } else {
                page += 1
                _state.update { it.copy(isLoadingMore = true, error = null) }
            }

            val sort = _state.value.sort

            try {
                val (records, total) = progress.all(
                    page = page,
                    limit = PageSize,
                    sort = sort.rawValue,
                )
                _state.update {
                    it.copy(
                        records = if (reset) records else it.records + records,
                        total = total,
                        isLoading = false,
                        isLoadingMore = false,
                    )
                }
            } catch (error: Exception) {
                if (!reset) page -= 1
                _state.update {
                    it.copy(
                        isLoading = false,
                        isLoadingMore = false,
                        error = historyErrorMessage(error),
                    )
                }
            }
        }
    }

    private companion object {
        const val PageSize = 50
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryRoute(
    viewModel: HistoryViewModel = hiltViewModel(),
    onBack: (() -> Unit)? = null,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val libraryUpdatedAt by viewModel.libraryUpdatedAt.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    var sortMenuOpen by remember { mutableStateOf(false) }

    val backDispatcher = LocalOnBackPressedDispatcherOwner.current?.onBackPressedDispatcher
    val backAction: (() -> Unit)? = onBack ?: backDispatcher?.let { dispatcher ->
        { dispatcher.onBackPressed() }
    }

    val records = state.records
    val error = state.error

    LaunchedEffect(libraryUpdatedAt) {
        if (libraryUpdatedAt != null) viewModel.refresh()
    }

    LaunchedEffect(listState, records.size, state.total, state.isLoadingMore) {
        snapshotFlow { listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: -1 }
            .collect { lastVisibleIndex ->
                val hasMore = records.size < state.total && !state.isLoadingMore
                if (hasMore && lastVisibleIndex >= records.size - 1) {
                    viewModel.loadMore()
                }
            }
    }

    fun copyLog(record: ProgressRecord) {
        clipboard.setText(AnnotatedString(record.logLine))
        scope.launch { snackbarHostState.showSnackbar("Copiado al portapapeles") }
    }

    fun shareLog(record: ProgressRecord) {
        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, record.logLine)
        }
        context.startActivity(Intent.createChooser(sendIntent, "Compartir .log"))
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Historial") },
                navigationIcon = {
                    if (backAction != null) {
                        IconButton(onClick = backAction) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Volver",
                            )
                        }
                    }
                },
                actions = {
                    Box {
                        IconButton(onClick = { sortMenuOpen = true }) {
                            Icon(
                                imageVector = Icons.Filled.SwapVert,
                                contentDescription = "Ordenar",
                            )
                        }

                        DropdownMenu(
                            expanded = sortMenuOpen,
                            onDismissRequest = { sortMenuOpen = false },
                        ) {
                            HistoryViewModel.Sort.entries.forEach { option ->
                                val selected = option == state.sort
                                DropdownMenuItem(
                                    text = { Text(option.title) },
                                    trailingIcon = if (selected) {
                                        {
                                            Icon(
                                                imageVector = Icons.Filled.Check,
                                                contentDescription = null,
                                            )
                                        }
                                    } else {
                                        null
                                    },
                                    onClick = {
                                        sortMenuOpen = false
                                        viewModel.selectSort(option)
                                    },
                                )
                            }
                        }
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            when {
                state.isLoading && records.isEmpty() -> LoadingBox()

                error != null && records.isEmpty() -> ErrorBox(
                    message = error,
                    onRetry = viewModel::refresh,
                )

                records.isEmpty() -> EmptyBox("Aquí aparecerá tu actividad de lectura.")

                else -> PullToRefreshBox(
                    isRefreshing = state.isLoading,
                    onRefresh = viewModel::refresh,
                    modifier = Modifier.fillMaxSize(),
                ) {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier
                            .fillMaxSize()
                            .testTag("historyList"),
                    ) {
                        items(records, key = { it.id }) { record ->
                            HistoryRow(
                                record = record,
                                onCopy = { copyLog(record) },
                                onShare = { shareLog(record) },
                            )
                            HorizontalDivider()
                        }

                        if (state.isLoadingMore) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    CircularProgressIndicator()
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HistoryRow(
    record: ProgressRecord,
    onCopy: () -> Unit,
    onShare: () -> Unit,
) {
    var menuOpen by remember(record.id) { mutableStateOf(false) }

    Box {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .combinedClickable(
                    onClick = {},
                    onLongClick = { menuOpen = true },
                )
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            LogRow(record = record, modifier = Modifier.weight(1f))

            IconButton(onClick = onShare) {
                Icon(
                    imageVector = Icons.Filled.Share,
                    contentDescription = "Compartir .log",
                )
            }
        }

        DropdownMenu(
            expanded = menuOpen,
            onDismissRequest = { menuOpen = false },
        ) {
            DropdownMenuItem(
                text = { Text("Copiar .log") },
                onClick = {
                    menuOpen = false
                    onCopy()
                },
            )
            DropdownMenuItem(
                text = { Text("Compartir") },
                onClick = {
                    menuOpen = false
                    onShare()
                },
            )
        }
    }
}

private fun historyErrorMessage(error: Throwable): String =
    (error as? ApiException)?.userMessage
        ?: error.message
        ?: "Ha ocurrido un error inesperado."
