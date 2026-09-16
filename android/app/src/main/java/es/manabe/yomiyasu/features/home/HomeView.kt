package es.manabe.yomiyasu.features.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import es.manabe.yomiyasu.components.BookCard
import es.manabe.yomiyasu.components.BookCardActions
import es.manabe.yomiyasu.components.EmptyBox
import es.manabe.yomiyasu.components.ErrorBox
import es.manabe.yomiyasu.components.LoadingBox
import es.manabe.yomiyasu.components.SerieCard
import es.manabe.yomiyasu.components.LibraryActionsHost
import es.manabe.yomiyasu.components.SerieCardActions
import es.manabe.yomiyasu.components.rememberLibraryActions
import es.manabe.yomiyasu.core.models.Book
import es.manabe.yomiyasu.core.models.BooksQuery
import es.manabe.yomiyasu.core.models.MainView
import es.manabe.yomiyasu.core.models.Serie
import es.manabe.yomiyasu.core.models.SeriesQuery
import es.manabe.yomiyasu.core.models.SortValue
import es.manabe.yomiyasu.core.models.Variant
import es.manabe.yomiyasu.core.networking.ApiException
import es.manabe.yomiyasu.core.services.DownloadManager
import es.manabe.yomiyasu.core.services.LibraryActions
import es.manabe.yomiyasu.core.services.LibraryApi
import es.manabe.yomiyasu.core.services.SocketService
import es.manabe.yomiyasu.core.services.StaticUrls
import es.manabe.yomiyasu.core.settings.AppSettings
import es.manabe.yomiyasu.core.settings.AppSettingsData
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeData(
    val readingBooks: List<Book> = emptyList(),
    val tableroBooks: List<Book> = emptyList(),
    val readlaterManga: List<Serie> = emptyList(),
    val readlaterNovela: List<Serie> = emptyList(),
    val pausedManga: List<Serie> = emptyList(),
    val pausedNovela: List<Serie> = emptyList(),
    val newMangaBooks: List<Book> = emptyList(),
    val newNovelaBooks: List<Book> = emptyList(),
    val newMangaSeries: List<Serie> = emptyList(),
    val newNovelaSeries: List<Serie> = emptyList(),
    val recentMangaSeries: List<Serie> = emptyList(),
    val recentNovelaSeries: List<Serie> = emptyList(),
) {
    val isEmpty: Boolean
        get() = readingBooks.isEmpty() && tableroBooks.isEmpty() &&
            readlaterManga.isEmpty() && readlaterNovela.isEmpty() &&
            pausedManga.isEmpty() && pausedNovela.isEmpty() &&
            newMangaBooks.isEmpty() && newNovelaBooks.isEmpty() &&
            newMangaSeries.isEmpty() && newNovelaSeries.isEmpty() &&
            recentMangaSeries.isEmpty() && recentNovelaSeries.isEmpty()
}

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val library: LibraryApi,
    private val socket: SocketService,
    settings: AppSettings,
) : ViewModel() {

    private val _data = MutableStateFlow(HomeData())
    val data: StateFlow<HomeData> = _data.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    val settingsData: StateFlow<AppSettingsData> = settings.flow

    init {
        viewModelScope.launch {
            socket.libraryUpdatedAt.collect { load() }
        }
        viewModelScope.launch {
            settingsData
                .map { it.boards }
                .distinctUntilChanged()
                .drop(1)
                .collect { load() }
        }
    }

    fun load() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            val boards = settingsData.value.boards

            try {
                coroutineScope {
                    val reading = async { if (boards.progress) library.reading() else emptyList() }
                    val tablero = async { if (boards.tablero) library.tablero() else emptyList() }
                    val readlaterManga = async {
                        if (boards.readLater) {
                            library.readlist(es.manabe.yomiyasu.core.models.LibraryVariant.Manga)
                        } else {
                            emptyList()
                        }
                    }
                    val readlaterNovela = async {
                        if (boards.readLater) {
                            library.readlist(es.manabe.yomiyasu.core.models.LibraryVariant.Novela)
                        } else {
                            emptyList()
                        }
                    }
                    val pausedManga = async {
                        if (boards.paused) {
                            library.pausedSeries(es.manabe.yomiyasu.core.models.LibraryVariant.Manga)
                        } else {
                            emptyList()
                        }
                    }
                    val pausedNovela = async {
                        if (boards.paused) {
                            library.pausedSeries(es.manabe.yomiyasu.core.models.LibraryVariant.Novela)
                        } else {
                            emptyList()
                        }
                    }
                    val newMangaBooks = async {
                        if (!boards.newBooks) return@async emptyList()
                        library.books(
                            BooksQuery(
                                variant = es.manabe.yomiyasu.core.models.LibraryVariant.Manga,
                                sort = SortValue.BooksNewest,
                                limit = 15,
                            ),
                        )
                    }
                    val newNovelaBooks = async {
                        if (!boards.newBooks) return@async emptyList()
                        library.books(
                            BooksQuery(
                                variant = es.manabe.yomiyasu.core.models.LibraryVariant.Novela,
                                sort = SortValue.BooksNewest,
                                limit = 15,
                            ),
                        )
                    }
                    val newMangaSeries = async {
                        if (!boards.newSeries) return@async emptyList()
                        library.seriesList(
                            SeriesQuery(variant = es.manabe.yomiyasu.core.models.LibraryVariant.Manga, sort = SortValue.SeriesNewest, limit = 15),
                        )
                    }
                    val newNovelaSeries = async {
                        if (!boards.newSeries) return@async emptyList()
                        library.seriesList(
                            SeriesQuery(variant = es.manabe.yomiyasu.core.models.LibraryVariant.Novela, sort = SortValue.SeriesNewest, limit = 15),
                        )
                    }
                    val recentMangaSeries = async {
                        if (!boards.recentSeries) return@async emptyList()
                        library.seriesList(
                            SeriesQuery(variant = es.manabe.yomiyasu.core.models.LibraryVariant.Manga, sort = SortValue.SeriesRecent, limit = 15),
                        )
                    }
                    val recentNovelaSeries = async {
                        if (!boards.recentSeries) return@async emptyList()
                        library.seriesList(
                            SeriesQuery(variant = es.manabe.yomiyasu.core.models.LibraryVariant.Novela, sort = SortValue.SeriesRecent, limit = 15),
                        )
                    }

                    awaitAll(
                        reading, tablero, readlaterManga, readlaterNovela, pausedManga, pausedNovela,
                        newMangaBooks, newNovelaBooks, newMangaSeries, newNovelaSeries,
                        recentMangaSeries, recentNovelaSeries,
                    )

                    _data.value = HomeData(
                        readingBooks = reading.await(),
                        tableroBooks = tablero.await(),
                        readlaterManga = readlaterManga.await(),
                        readlaterNovela = readlaterNovela.await(),
                        pausedManga = pausedManga.await(),
                        pausedNovela = pausedNovela.await(),
                        newMangaBooks = newMangaBooks.await(),
                        newNovelaBooks = newNovelaBooks.await(),
                        newMangaSeries = newMangaSeries.await(),
                        newNovelaSeries = newNovelaSeries.await(),
                        recentMangaSeries = recentMangaSeries.await(),
                        recentNovelaSeries = recentNovelaSeries.await(),
                    )
                }
            } catch (error: ApiException) {
                _error.value = error.userMessage
            } catch (error: Exception) {
                _error.value = "No se pudo cargar"
            } finally {
                _isLoading.value = false
            }
        }
    }
}

private fun filterMainViewBooks(books: List<Book>, mainView: MainView): List<Book> = when (mainView) {
    MainView.Manga -> books.filter { it.variant == Variant.Manga }
    MainView.Novels -> books.filter { it.variant == Variant.Novela }
    MainView.Both -> books
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeRoute(
    mainView: MainView,
    onOpenSerie: (String) -> Unit,
    onOpenBook: (String) -> Unit,
    onMarkLibraryUpdated: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val data by viewModel.data.collectAsStateWithLifecycle()
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()
    val settingsData by viewModel.settingsData.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val actions = rememberLibraryActions(snackbar)
    val downloadRecords by actions.downloads.records.collectAsStateWithLifecycle()

    var searchOpen by remember { mutableStateOf(false) }
    if (searchOpen) {
        es.manabe.yomiyasu.features.library.SearchView(
            onBack = { searchOpen = false },
            onOpenSerie = { searchOpen = false; onOpenSerie(it) },
            onOpenBook = { searchOpen = false; onOpenBook(it) },
        )
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Yomiyasu") },
                actions = {
                    IconButton(onClick = { searchOpen = true }) {
                        Icon(Icons.Filled.Search, contentDescription = "Buscar")
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = isLoading,
            onRefresh = { viewModel.load() },
            modifier = Modifier.padding(padding),
        ) {
            when {
                isLoading && data.isEmpty -> LoadingBox()
                error != null && data.isEmpty -> ErrorBox(
                    message = error ?: "No se pudo cargar",
                    onRetry = { viewModel.load() },
                )
                data.isEmpty -> EmptyBox("Tu biblioteca está vacía\nAñade contenido al servidor para empezar.")
                else -> LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("homeList"),
                    contentPadding = PaddingValues(vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(22.dp),
                ) {
                    val boards = settingsData.boards

                    val filteredReading = filterMainViewBooks(data.readingBooks, mainView)
                    if (boards.progress && filteredReading.isNotEmpty()) {
                        item { BooksScroller("En progreso", filteredReading, settingsData, actions, downloadRecords, onOpenSerie, onOpenBook) }
                    }

                    val filteredTablero = filterMainViewBooks(data.tableroBooks, mainView)
                    if (boards.tablero && filteredTablero.isNotEmpty()) {
                        item { BooksScroller("Tu tablero", filteredTablero, settingsData, actions, downloadRecords, onOpenSerie, onOpenBook) }
                    }

                    if (boards.readLater && mainView != MainView.Novels && data.readlaterManga.isNotEmpty()) {
                        item { SeriesScroller("Leer más tarde (manga)", data.readlaterManga, actions, onOpenSerie, onOpenBook) }
                    }
                    if (boards.readLater && mainView != MainView.Manga && data.readlaterNovela.isNotEmpty()) {
                        item { SeriesScroller("Leer más tarde (novelas)", data.readlaterNovela, actions, onOpenSerie, onOpenBook) }
                    }
                    if (boards.paused && mainView != MainView.Novels && data.pausedManga.isNotEmpty()) {
                        item { SeriesScroller("Pausadas (manga)", data.pausedManga, actions, onOpenSerie, onOpenBook) }
                    }
                    if (boards.paused && mainView != MainView.Manga && data.pausedNovela.isNotEmpty()) {
                        item { SeriesScroller("Pausadas (novelas)", data.pausedNovela, actions, onOpenSerie, onOpenBook) }
                    }
                    if (boards.newBooks && mainView != MainView.Novels && data.newMangaBooks.isNotEmpty()) {
                        item { BooksScroller("Mangas nuevos", data.newMangaBooks, settingsData, actions, downloadRecords, onOpenSerie, onOpenBook) }
                    }
                    if (boards.newBooks && mainView != MainView.Manga && data.newNovelaBooks.isNotEmpty()) {
                        item { BooksScroller("Novelas nuevas", data.newNovelaBooks, settingsData, actions, downloadRecords, onOpenSerie, onOpenBook) }
                    }
                    if (boards.newSeries && mainView != MainView.Novels && data.newMangaSeries.isNotEmpty()) {
                        item { SeriesScroller("Series de manga nuevas", data.newMangaSeries, actions, onOpenSerie, onOpenBook) }
                    }
                    if (boards.newSeries && mainView != MainView.Manga && data.newNovelaSeries.isNotEmpty()) {
                        item { SeriesScroller("Series de novelas nuevas", data.newNovelaSeries, actions, onOpenSerie, onOpenBook) }
                    }
                    if (boards.recentSeries && mainView != MainView.Novels && data.recentMangaSeries.isNotEmpty()) {
                        item { SeriesScroller("Series de manga con volúmenes nuevos", data.recentMangaSeries, actions, onOpenSerie, onOpenBook) }
                    }
                    if (boards.recentSeries && mainView != MainView.Manga && data.recentNovelaSeries.isNotEmpty()) {
                        item { SeriesScroller("Series de novelas con volúmenes nuevos", data.recentNovelaSeries, actions, onOpenSerie, onOpenBook) }
                    }
                }
            }
        }
    }
}

@Composable
private fun BooksScroller(
    title: String,
    books: List<Book>,
    settings: AppSettingsData,
    actions: LibraryActionsHost,
    downloadRecords: Map<String, es.manabe.yomiyasu.core.services.DownloadRecord>,
    onOpenSerie: (String) -> Unit,
    onOpenBook: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(horizontal = 16.dp),
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(books, key = { it.id }) { book ->
                BookCard(
                    book = book,
                    coverUrl = actions.staticUrls.bookCover(book)?.toString(),
                    settings = settings,
                    isDownloaded = downloadRecords.containsKey(book.id),
                    actions = BookCardActions(
                        onOpen = { onOpenBook(book.id) },
                        onGoToSerie = book.serie?.let { serieId -> { onOpenSerie(serieId) } },
                        onMarkCompleted = { page, chars -> actions.actions.markCompleted(book, page, chars) },
                        onMarkUnread = { actions.actions.markUnread(book) },
                        onToggleReadlist = book.serie?.let { _ ->
                            {
                                actions.actions.toggleReadlist(
                                    serieId = book.serie.orEmpty(),
                                    isInReadlist = book.readlist?.isInReadlist == true,
                                )
                            }
                        },
                        onDownload = { actions.actions.download(book) },
                    ),
                )
            }
        }
    }
}

@Composable
private fun SeriesScroller(
    title: String,
    series: List<Serie>,
    actions: LibraryActionsHost,
    onOpenSerie: (String) -> Unit,
    onOpenBook: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(horizontal = 16.dp),
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(series, key = { it.id }) { serie ->
                SerieCard(
                    serie = serie,
                    coverUrl = actions.staticUrls.serieCover(serie)?.toString(),
                    actions = SerieCardActions(
                        onOpen = { onOpenSerie(serie.id) },
                        onContinueReading = serie.currentBook?.let { current ->
                            { onOpenBook(current.id) }
                        },
                        onMarkRead = { actions.actions.markSerieRead(serie.id) },
                        onTogglePaused = { actions.actions.setSeriePaused(!serie.isPaused, serie.id) },
                        onToggleReadlist = { actions.actions.toggleReadlist(serie.id, serie.isInReadlist) },
                    ),
                )
            }
        }
    }
}
