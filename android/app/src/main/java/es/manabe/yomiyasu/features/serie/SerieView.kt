package es.manabe.yomiyasu.features.serie

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkRemove
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Casino
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SmallFloatingActionButton
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import es.manabe.yomiyasu.components.BookCard
import es.manabe.yomiyasu.components.BookCardActions
import es.manabe.yomiyasu.components.DifficultyFlame
import es.manabe.yomiyasu.components.ErrorBox
import es.manabe.yomiyasu.components.LoadingBox
import es.manabe.yomiyasu.components.RemoteImage
import es.manabe.yomiyasu.components.StarRating
import es.manabe.yomiyasu.components.rememberLibraryActions
import es.manabe.yomiyasu.core.models.Book
import es.manabe.yomiyasu.core.models.BooksQuery
import es.manabe.yomiyasu.core.models.LibraryVariant
import es.manabe.yomiyasu.core.models.ProgressStatus
import es.manabe.yomiyasu.core.models.Serie
import es.manabe.yomiyasu.core.models.SeriesQuery
import es.manabe.yomiyasu.core.models.SortValue
import es.manabe.yomiyasu.core.networking.ApiException
import es.manabe.yomiyasu.core.services.DownloadState
import es.manabe.yomiyasu.core.services.LibraryApi
import es.manabe.yomiyasu.core.services.SocketService
import es.manabe.yomiyasu.core.settings.AppSettings
import es.manabe.yomiyasu.core.settings.AppSettingsData
import es.manabe.yomiyasu.core.settings.RandomCriteriaStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SerieViewModel @Inject constructor(
    private val library: LibraryApi,
    private val socket: SocketService,
    private val randomCriteria: RandomCriteriaStore,
    settings: AppSettings,
) : ViewModel() {

    private val _serie = MutableStateFlow<Serie?>(null)
    val serie: StateFlow<Serie?> = _serie.asStateFlow()

    private val _books = MutableStateFlow<List<Book>>(emptyList())
    val books: StateFlow<List<Book>> = _books.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _actionError = MutableStateFlow<String?>(null)
    val actionError: StateFlow<String?> = _actionError.asStateFlow()

    fun clearActionError() {
        _actionError.value = null
    }

    fun reroll(randomVariant: LibraryVariant, onResult: (String?) -> Unit) {
        viewModelScope.launch {
            val criteria = randomCriteria.criteria(randomVariant)

            if (criteria == null) {
                onResult(null)
                return@launch
            }

            try {
                val query = criteria.applyingTo(SeriesQuery(variant = randomVariant))
                onResult(library.randomSerie(query).id)
            } catch (error: ApiException) {
                _actionError.value = error.userMessage
                onResult(null)
            }
        }
    }

    val settingsData: StateFlow<AppSettingsData> = settings.flow

    private var didLoad = false
    private var lastSerieId: String? = null

    init {
        viewModelScope.launch {
            socket.libraryUpdatedAt.collect {
                lastSerieId?.let { id -> if (didLoad) load(id) }
            }
        }
    }

    fun load(id: String) {
        lastSerieId = id
        viewModelScope.launch {
            if (!didLoad) _isLoading.value = true
            _error.value = null

            try {
                val detail = library.serieDetail(id)
                _serie.value = detail

                val variant = detail.variant?.let { variant ->
                    LibraryVariant.entries.firstOrNull { it.rawValue == variant.name.lowercase() }
                } ?: LibraryVariant.All

                _books.value = library.books(
                    BooksQuery(variant = variant, serie = id, sort = SortValue.BooksDefault),
                )
            } catch (error: ApiException) {
                _error.value = error.userMessage
            } finally {
                _isLoading.value = false
                didLoad = true
            }
        }
    }

    fun toggleReadlist() {
        val serie = _serie.value ?: return
        viewModelScope.launch {
            try {
                if (serie.isInReadlist) {
                    library.removeFromReadlist(serie.id)
                } else {
                    library.addToReadlist(serie.id)
                }
                socket.markLibraryUpdated()
                load(serie.id)
            } catch (error: ApiException) {
                _error.value = error.userMessage
            }
        }
    }

    fun markRead() {
        val serie = _serie.value ?: return
        viewModelScope.launch {
            try {
                library.markSerieRead(serie.id)
                socket.markLibraryUpdated()
                load(serie.id)
            } catch (error: ApiException) {
                _error.value = error.userMessage
            }
        }
    }

    fun setPaused(paused: Boolean) {
        val serie = _serie.value ?: return
        viewModelScope.launch {
            try {
                library.setSeriePaused(paused, serie.id)
                socket.markLibraryUpdated()
                load(serie.id)
            } catch (error: ApiException) {
                _error.value = error.userMessage
            }
        }
    }

    fun shouldBlur(index: Int): Boolean {
        val serie = _serie.value ?: return false
        val readCount = _books.value.size - serie.unreadCount
        return index >= readCount
    }

    val continueBook: Book?
        get() = _books.value.lastOrNull { it.resolvedStatus == ProgressStatus.Reading }
            ?: _books.value.firstOrNull()

    val continueLabel: String
        get() {
            val serie = _serie.value ?: return "Leer"
            if (serie.unreadCount == 0) return "Leer de nuevo"
            if (serie.unreadCount == serie.totalBooks) return "Empezar a leer"
            return "Seguir leyendo"
        }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SerieRoute(
    serieId: String,
    randomVariant: LibraryVariant? = null,
    onOpenBook: (String) -> Unit,
    onBack: () -> Unit,
    viewModel: SerieViewModel = hiltViewModel(),
) {
    val serie by viewModel.serie.collectAsStateWithLifecycle()
    val books by viewModel.books.collectAsStateWithLifecycle()
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()
    val settings by viewModel.settingsData.collectAsStateWithLifecycle()
    val actionError by viewModel.actionError.collectAsStateWithLifecycle()

    val snackbar = remember { SnackbarHostState() }
    val actions = rememberLibraryActions(snackbar)
    val downloadStates by actions.downloads.states.collectAsStateWithLifecycle()
    val downloadRecords by actions.downloads.records.collectAsStateWithLifecycle()

    var menuOpen by remember { mutableStateOf(false) }
    var summaryExpanded by remember { mutableStateOf(false) }
    var markReadDialog by remember { mutableStateOf(false) }
    var reviewFormOpen by remember { mutableStateOf(false) }
    var activeSerieId by remember { mutableStateOf(serieId) }
    var rerollActive by remember { mutableStateOf(randomVariant != null) }

    LaunchedEffect(activeSerieId) { viewModel.load(activeSerieId) }

    LaunchedEffect(actionError) {
        actionError?.let {
            snackbar.showSnackbar(it)
            viewModel.clearActionError()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(serie?.visibleName ?: "") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                },
                actions = {
                    if (serie != null) {
                        Box {
                            IconButton(onClick = { menuOpen = true }) {
                                Icon(Icons.Filled.MoreVert, contentDescription = "Acciones")
                            }
                            DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            if (serie?.isInReadlist == true) "Quitar de la lista" else "Añadir a la lista",
                                        )
                                    },
                                    leadingIcon = {
                                        Icon(
                                            imageVector = if (serie?.isInReadlist == true) {
                                                Icons.Filled.BookmarkRemove
                                            } else {
                                                Icons.Filled.Bookmark
                                            },
                                            contentDescription = null,
                                        )
                                    },
                                    onClick = {
                                        menuOpen = false
                                        viewModel.toggleReadlist()
                                    },
                                )

                                DropdownMenuItem(
                                    text = { Text(if (serie?.isPaused == true) "Reanudar serie" else "Pausar serie") },
                                    leadingIcon = {
                                        Icon(
                                            imageVector = if (serie?.isPaused == true) {
                                                Icons.Filled.PlayArrow
                                            } else {
                                                Icons.Filled.Pause
                                            },
                                            contentDescription = null,
                                        )
                                    },
                                    onClick = {
                                        menuOpen = false
                                        viewModel.setPaused(!(serie?.isPaused ?: false))
                                    },
                                )

                                if ((serie?.unreadCount ?: 0) > 0) {
                                    DropdownMenuItem(
                                        text = { Text("Marcar serie como leída") },
                                        leadingIcon = {
                                            Icon(Icons.Filled.CheckCircle, contentDescription = null)
                                        },
                                        onClick = {
                                            menuOpen = false
                                            markReadDialog = true
                                        },
                                    )
                                }

                                val hasPending = books.any {
                                    downloadStates[it.id] !is DownloadState.Downloaded
                                }
                                if (hasPending) {
                                    DropdownMenuItem(
                                        text = { Text("Descargar serie") },
                                        leadingIcon = {
                                            Icon(Icons.Filled.Download, contentDescription = null)
                                        },
                                        onClick = {
                                            menuOpen = false
                                            actions.actions.enqueueSeries(books)
                                        },
                                    )
                                }

                                val hasDownloaded = books.any { downloadRecords.containsKey(it.id) }
                                if (hasDownloaded) {
                                    DropdownMenuItem(
                                        text = { Text("Eliminar descargas") },
                                        leadingIcon = {
                                            Icon(Icons.Filled.Delete, contentDescription = null)
                                        },
                                        onClick = {
                                            menuOpen = false
                                            books.filter { downloadRecords.containsKey(it.id) }
                                                .forEach { actions.downloads.delete(it.id) }
                                        },
                                    )
                                }
                            }
                        }
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
        floatingActionButton = {
            val variant = randomVariant
            if (rerollActive && variant != null) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    SmallFloatingActionButton(
                        onClick = {
                            viewModel.reroll(variant) { newSerieId ->
                                if (newSerieId != null) activeSerieId = newSerieId
                            }
                        },
                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                    ) {
                        Icon(Icons.Filled.Casino, contentDescription = "Tirar el dado otra vez")
                    }
                    SmallFloatingActionButton(
                        onClick = { rerollActive = false },
                    ) {
                        Icon(Icons.Filled.Close, contentDescription = "Cerrar dado")
                    }
                }
            }
        },
    ) { padding ->
        when {
            serie == null && isLoading -> LoadingBox(Modifier.padding(padding))
            serie == null && error != null -> ErrorBox(
                message = error ?: "No se pudo cargar",
                modifier = Modifier.padding(padding),
                onRetry = { viewModel.load(activeSerieId) },
            )
            serie != null -> LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .testTag("serieView"),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(18.dp),
            ) {
                item { SerieHeader(serie!!) }

                val summary = serie?.plainSummary.orEmpty()
                if (summary.isNotEmpty()) {
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                text = summary,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = if (summaryExpanded) Int.MAX_VALUE else 6,
                            )
                            TextButton(onClick = { summaryExpanded = !summaryExpanded }) {
                                Text(if (summaryExpanded) "Ver menos" else "Ver más")
                            }
                        }
                    }
                }

                val continueBook = viewModel.continueBook
                if (continueBook != null) {
                    item {
                        Button(
                            onClick = { onOpenBook(continueBook.id) },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(viewModel.continueLabel)
                        }
                    }
                }

                if (books.isNotEmpty()) {
                    item {
                        Text("Volúmenes", style = MaterialTheme.typography.titleMedium)
                    }

                    books.chunked(3).forEachIndexed { rowIndex, rowBooks ->
                        item {
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                rowBooks.forEachIndexed { columnIndex, book ->
                                    val globalIndex = rowIndex * 3 + columnIndex
                                    BookCard(
                                        book = book,
                                        coverUrl = actions.staticUrls.bookCover(book)?.toString(),
                                        settings = settings,
                                        blurred = settings.antispoilers && viewModel.shouldBlur(globalIndex),
                                        isDownloaded = downloadRecords.containsKey(book.id),
                                        width = 104.dp,
                                        actions = BookCardActions(
                                            onOpen = { onOpenBook(book.id) },
                                            onMarkCompleted = { page, chars ->
                                                actions.actions.markCompleted(book, page, chars)
                                            },
                                            onMarkUnread = { actions.actions.markUnread(book) },
                                            onDownload = if (downloadRecords.containsKey(book.id)) {
                                                null
                                            } else {
                                                {
                                                    when (downloadStates[book.id]) {
                                                        is DownloadState.Queued,
                                                        is DownloadState.Downloading,
                                                        -> actions.downloads.cancel(book.id)
                                                        else -> actions.actions.download(book)
                                                    }
                                                }
                                            },
                                        ),
                                    )
                                }
                            }
                        }
                    }
                }

                item { SerieSpeedSection(serieId = serie!!.id) }

                item {
                    SerieReviewsSection(
                        serieId = serie!!.id,
                        reviews = serie?.reviews ?: emptyList(),
                        onWriteReview = { reviewFormOpen = true },
                        onReviewsChanged = { viewModel.load(serieId) },
                    )
                }
            }
        }
    }

    if (markReadDialog) {
        AlertDialog(
            onDismissRequest = { markReadDialog = false },
            title = { Text("¿Marcar toda la serie como leída?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        markReadDialog = false
                        viewModel.markRead()
                    },
                ) { Text("Marcar como leída") }
            },
            dismissButton = {
                TextButton(onClick = { markReadDialog = false }) { Text("Cancelar") }
            },
        )
    }

    if (reviewFormOpen) {
        ReviewFormDialog(
            serieId = serieId,
            onDismiss = { reviewFormOpen = false },
            onSubmitted = { viewModel.load(serieId) },
        )
    }
}

@Composable
private fun SerieHeader(serie: Serie) {
    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        RemoteImage(
            url = rememberStaticUrlsSafe(serie),
            contentDescription = serie.visibleName,
            modifier = Modifier
                .width(130.dp)
                .height(188.dp)
                .clip(RoundedCornerShape(12.dp)),
        )

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (serie.displayAuthors.isNotEmpty()) {
                Text(
                    text = serie.displayAuthors.joinToString(", "),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                serie.status?.let { status ->
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceContainerHighest,
                        shape = RoundedCornerShape(50),
                    ) {
                        Text(
                            text = status.title,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        )
                    }
                }

                if (serie.isPaused) {
                    Text(
                        text = "Pausada",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.tertiary,
                    )
                }
            }

            Text(
                text = "${serie.totalBooks} volúmenes · ${serie.unreadCount} sin leer",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                DifficultyFlame(difficulty = serie.difficulty, size = 16)
                Text(
                    text = String.format("%.1f", serie.difficulty ?: 0.0),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                StarRating(valoration = serie.valoration)
            }

            if (serie.displayGenres.isNotEmpty()) {
                Text(
                    text = serie.displayGenres.joinToString(" · "),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                )
            }
        }
    }
}

@Composable
private fun rememberStaticUrlsSafe(serie: Serie): String? {
    val urls = es.manabe.yomiyasu.components.rememberStaticUrls()
    return remember(serie.id) { urls.serieCover(serie)?.toString() }
}
