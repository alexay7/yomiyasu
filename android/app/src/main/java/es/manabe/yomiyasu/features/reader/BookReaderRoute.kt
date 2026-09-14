package es.manabe.yomiyasu.features.reader

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import es.manabe.yomiyasu.components.LoadingBox
import es.manabe.yomiyasu.core.models.Book
import es.manabe.yomiyasu.core.models.Variant
import es.manabe.yomiyasu.core.networking.ApiException
import es.manabe.yomiyasu.core.services.LibraryApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class BookReaderViewModel @Inject constructor(
    private val library: LibraryApi,
) : ViewModel() {

    private val _book = MutableStateFlow<Book?>(null)
    val book: StateFlow<Book?> = _book.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    fun load(bookId: String) {
        if (_book.value?.id == bookId) return

        viewModelScope.launch {
            _error.value = null
            try {
                _book.value = library.book(bookId)
            } catch (error: ApiException) {
                _error.value = error.userMessage
            }
        }
    }
}

@Composable
fun BookReaderRoute(
    bookId: String,
    onBack: () -> Unit,
    viewModel: BookReaderViewModel = hiltViewModel(),
) {
    val book by viewModel.book.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()

    LaunchedEffect(bookId) { viewModel.load(bookId) }

    val current = book
    when {
        current == null && error == null -> Box(modifier = Modifier.fillMaxSize()) {
            LoadingBox()
        }

        current == null && error != null -> es.manabe.yomiyasu.components.ErrorBox(
            message = error ?: "No se pudo abrir",
            onRetry = { viewModel.load(bookId) },
        )

        current != null -> {
            val isNovel = current.variant == Variant.Novela && !current.isMokured

            if (isNovel) {
                es.manabe.yomiyasu.features.novel.NovelReaderView(
                    initialBookId = bookId,
                    onBack = onBack,
                )
            } else {
                MangaReaderView(
                    initialBookId = bookId,
                    onBack = onBack,
                )
            }
        }
    }
}
