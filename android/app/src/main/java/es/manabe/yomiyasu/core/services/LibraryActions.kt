package es.manabe.yomiyasu.core.services

import es.manabe.yomiyasu.core.di.ApplicationScope
import es.manabe.yomiyasu.core.models.Book
import es.manabe.yomiyasu.core.models.Serie
import es.manabe.yomiyasu.core.networking.ApiException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Acciones compartidas por tarjetas y pantallas de biblioteca: marcado de progreso,
 * listas de lectura, pausa de series y descargas. Los errores se publican en [errors]
 * para que la pantalla activa los muestre en un snackbar.
 */
@Singleton
class LibraryActions @Inject constructor(
    private val library: LibraryApi,
    private val progress: ProgressApi,
    private val downloads: DownloadManager,
    private val socket: SocketService,
    @ApplicationScope private val scope: CoroutineScope,
) {
    private val _errors = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val errors: SharedFlow<String> = _errors.asSharedFlow()

    fun markCompleted(book: Book, currentPage: Int? = null, characters: Int? = null) = run {
        scope.launch {
            try {
                progress.markCompleted(book, currentPage, characters)
                socket.markLibraryUpdated()
            } catch (error: ApiException) {
                _errors.tryEmit(error.userMessage)
            }
        }
    }

    fun markUnread(book: Book) = run {
        scope.launch {
            try {
                progress.markUnread(book)
                socket.markLibraryUpdated()
            } catch (error: ApiException) {
                _errors.tryEmit(error.userMessage)
            }
        }
    }

    fun toggleReadlist(serieId: String, isInReadlist: Boolean) = run {
        scope.launch {
            try {
                if (isInReadlist) {
                    library.removeFromReadlist(serieId)
                } else {
                    library.addToReadlist(serieId)
                }
                socket.markLibraryUpdated()
            } catch (error: ApiException) {
                _errors.tryEmit(error.userMessage)
            }
        }
    }

    fun markSerieRead(serieId: String) = run {
        scope.launch {
            try {
                library.markSerieRead(serieId)
                socket.markLibraryUpdated()
            } catch (error: ApiException) {
                _errors.tryEmit(error.userMessage)
            }
        }
    }

    fun setSeriePaused(paused: Boolean, serieId: String) = run {
        scope.launch {
            try {
                library.setSeriePaused(paused, serieId)
                socket.markLibraryUpdated()
            } catch (error: ApiException) {
                _errors.tryEmit(error.userMessage)
            }
        }
    }

    fun download(book: Book) {
        downloads.enqueue(book)
    }

    fun enqueueSeries(books: List<Book>) {
        downloads.enqueueSeries(books)
    }
}
