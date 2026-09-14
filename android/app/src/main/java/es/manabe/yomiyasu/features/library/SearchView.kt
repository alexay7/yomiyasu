package es.manabe.yomiyasu.features.library

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import es.manabe.yomiyasu.components.RemoteImage
import es.manabe.yomiyasu.components.rememberStaticUrls
import es.manabe.yomiyasu.core.models.Book
import es.manabe.yomiyasu.core.models.BooksQuery
import es.manabe.yomiyasu.core.models.LibraryVariant
import es.manabe.yomiyasu.core.models.Serie
import es.manabe.yomiyasu.core.models.SeriesQuery
import es.manabe.yomiyasu.core.models.SortValue
import es.manabe.yomiyasu.core.models.Variant
import es.manabe.yomiyasu.core.networking.ApiException
import es.manabe.yomiyasu.core.services.LibraryApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val library: LibraryApi,
) : ViewModel() {

    private val _queryText = MutableStateFlow("")
    val queryText: StateFlow<String> = _queryText.asStateFlow()

    private val _seriesResults = MutableStateFlow<List<Serie>>(emptyList())
    val seriesResults: StateFlow<List<Serie>> = _seriesResults.asStateFlow()

    private val _bookResults = MutableStateFlow<List<Book>>(emptyList())
    val bookResults: StateFlow<List<Book>> = _bookResults.asStateFlow()

    private val _isSearching = MutableStateFlow(false)
    val isSearching: StateFlow<Boolean> = _isSearching.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private var searchJob: Job? = null

    fun onQueryChange(text: String) {
        _queryText.value = text
        scheduleSearch()
    }

    private fun scheduleSearch() {
        searchJob?.cancel()

        val text = _queryText.value.trim()
        if (text.length < 2) {
            _seriesResults.value = emptyList()
            _bookResults.value = emptyList()
            _isSearching.value = false
            return
        }

        searchJob = viewModelScope.launch {
            delay(300)
            performSearch(text)
        }
    }

    private suspend fun performSearch(text: String) {
        _isSearching.value = true
        _error.value = null

        try {
            coroutineScope {
                val seriesAsync = async {
                    library.seriesList(
                        SeriesQuery(
                            variant = LibraryVariant.All,
                            name = text,
                            sort = SortValue.SeriesDefault,
                            limit = 25,
                        ),
                    )
                }
                val booksAsync = async {
                    library.books(
                        BooksQuery(
                            variant = LibraryVariant.All,
                            name = text,
                            sort = SortValue.BooksDefault,
                            limit = 10,
                        ),
                    )
                }

                _seriesResults.value = seriesAsync.await()
                    .sortedWith(compareBy { it.variant != Variant.Manga })
                _bookResults.value = booksAsync.await()
                    .sortedWith(compareBy { it.variant != Variant.Manga })
            }
        } catch (error: ApiException) {
            _error.value = error.userMessage
        } finally {
            _isSearching.value = false
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchView(
    onBack: () -> Unit,
    onOpenSerie: (String) -> Unit,
    onOpenBook: (String) -> Unit,
    viewModel: SearchViewModel = hiltViewModel(),
) {
    val queryText by viewModel.queryText.collectAsStateWithLifecycle()
    val series by viewModel.seriesResults.collectAsStateWithLifecycle()
    val books by viewModel.bookResults.collectAsStateWithLifecycle()
    val isSearching by viewModel.isSearching.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()
    val staticUrls = rememberStaticUrls()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    OutlinedTextField(
                        value = queryText,
                        onValueChange = viewModel::onQueryChange,
                        placeholder = { Text("Series y libros (mínimo 2 letras)") },
                        singleLine = true,
                        leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                        trailingIcon = {
                            if (queryText.isNotEmpty()) {
                                IconButton(onClick = { viewModel.onQueryChange("") }) {
                                    Icon(Icons.Filled.Clear, contentDescription = "Limpiar")
                                }
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("searchField"),
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                },
            )
        },
    ) { padding ->
        when {
            isSearching && series.isEmpty() && books.isEmpty() -> Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                CircularProgressIndicator()
            }

            error != null && series.isEmpty() && books.isEmpty() -> Text(
                text = error.orEmpty(),
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier
                    .padding(padding)
                    .padding(16.dp),
            )

            else -> LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .testTag("searchResults"),
            ) {
                if (series.isNotEmpty()) {
                    item { SectionHeader("Series") }
                    items(series, key = { "serie-${it.id}" }) { serie ->
                        ResultRow(
                            title = serie.visibleName,
                            subtitle = "${(serie.variant ?: Variant.Manga).title} · ${serie.totalBooks} volúmenes",
                            imageUrl = staticUrls.serieCover(serie)?.toString(),
                            onClick = { onOpenSerie(serie.id) },
                        )
                    }
                }

                if (books.isNotEmpty()) {
                    item { SectionHeader("Libros") }
                    items(books, key = { "book-${it.id}" }) { book ->
                        ResultRow(
                            title = book.visibleName,
                            subtitle = (book.variant ?: Variant.Manga).title,
                            imageUrl = staticUrls.bookCover(book)?.toString(),
                            onClick = { onOpenBook(book.id) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
    )
}

@Composable
private fun ResultRow(
    title: String,
    subtitle: String,
    imageUrl: String?,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        RemoteImage(
            url = imageUrl,
            contentDescription = null,
            modifier = Modifier
                .width(40.dp)
                .height(58.dp)
                .clip(RoundedCornerShape(4.dp)),
        )

        Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(
                text = title,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.bodyMedium,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
