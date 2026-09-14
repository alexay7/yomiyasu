package es.manabe.yomiyasu.core.services

import android.content.Context
import android.text.format.Formatter
import dagger.hilt.android.qualifiers.ApplicationContext
import es.manabe.yomiyasu.core.di.ApplicationScope
import es.manabe.yomiyasu.core.mokuro.MokuroParser
import es.manabe.yomiyasu.core.models.Book
import es.manabe.yomiyasu.core.models.Variant
import es.manabe.yomiyasu.core.networking.ApiClient
import es.manabe.yomiyasu.core.networking.Endpoint
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import java.io.File
import java.net.URLDecoder
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
data class DownloadRecord(
    val bookId: String,
    val visibleName: String,
    val variant: String,
    val downloadedAt: Long,
    val byteCount: Long,
    val pageCount: Int,
)

sealed interface DownloadState {
    data object NotDownloaded : DownloadState
    data object Queued : DownloadState
    data class Downloading(val progress: Double, val detail: String) : DownloadState
    data object Downloaded : DownloadState
    data class Failed(val message: String) : DownloadState

    val isActive: Boolean
        get() = this is Queued || this is Downloading
}

data class ActiveDownload(
    val bookId: String,
    val name: String,
    val progress: Double,
    val detail: String,
    val isQueued: Boolean,
)

@Singleton
class DownloadManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: ApiClient,
    @ApplicationScope private val scope: CoroutineScope,
) {
    private val rootDir: File = File(context.filesDir, "Yomiyasu/Downloads")

    private val _records = MutableStateFlow<Map<String, DownloadRecord>>(emptyMap())
    val records: StateFlow<Map<String, DownloadRecord>> = _records.asStateFlow()

    private val _states = MutableStateFlow<Map<String, DownloadState>>(emptyMap())
    val states: StateFlow<Map<String, DownloadState>> = _states.asStateFlow()

    private val mutex = Mutex()
    private val queue = ArrayDeque<Book>()
    private val bookNames = mutableMapOf<String, String>()
    private var activeBookId: String? = null
    private var currentJob: Job? = null

    init {
        rootDir.mkdirs()
        loadManifest()
    }

    val sortedRecords: List<DownloadRecord>
        get() = _records.value.values.sortedByDescending { it.downloadedAt }

    val totalBytes: Long
        get() = _records.value.values.sumOf { it.byteCount }

    val active: List<ActiveDownload>
        get() = _states.value.entries
            .filter { it.value.isActive }
            .mapNotNull { (bookId, state) ->
                val name = bookNames[bookId] ?: return@mapNotNull null
                when (state) {
                    is DownloadState.Queued -> ActiveDownload(bookId, name, 0.0, "En cola", true)
                    is DownloadState.Downloading ->
                        ActiveDownload(bookId, name, state.progress, state.detail, false)
                    else -> null
                }
            }

    fun stateFor(bookId: String): DownloadState =
        _states.value[bookId]
            ?: if (_records.value.containsKey(bookId)) DownloadState.Downloaded else DownloadState.NotDownloaded

    fun isDownloaded(bookId: String): Boolean = _records.value.containsKey(bookId)

    fun bookDirectory(bookId: String): File = File(rootDir, bookId)

    fun localHtmlFile(bookId: String): File = File(bookDirectory(bookId), "book.html")

    fun localEpubFile(bookId: String): File = File(bookDirectory(bookId), "book.epub")

    fun localImagesDirectory(bookId: String): File = File(bookDirectory(bookId), "images")

    fun enqueue(book: Book) {
        if (_records.value.containsKey(book.id)) return
        val currentState = _states.value[book.id]
        if (currentState?.isActive == true) return
        if (queue.any { it.id == book.id }) return

        updateState(book.id, DownloadState.Queued)
        bookNames[book.id] = book.visibleName
        queue.addLast(book)
        processQueue()
    }

    fun enqueueSeries(books: List<Book>) {
        books.forEach(::enqueue)
    }

    fun cancel(bookId: String) {
        queue.removeAll { it.id == bookId }

        if (activeBookId == bookId) {
            currentJob?.cancel()
        } else {
            updateState(bookId, DownloadState.NotDownloaded)
            bookNames.remove(bookId)
        }
    }

    fun delete(bookId: String) {
        cancel(bookId)
        bookDirectory(bookId).deleteRecursively()
        _records.value = _records.value - bookId
        updateState(bookId, DownloadState.NotDownloaded)
        saveManifest()
    }

    private fun processQueue() {
        if (currentJob != null || queue.isEmpty()) return

        val book = queue.removeFirst()
        activeBookId = book.id

        currentJob = scope.launch {
            try {
                performDownload(book)
            } finally {
                mutex.withLock {
                    currentJob = null
                    activeBookId = null
                    bookNames.remove(book.id)
                }
                processQueue()
            }
        }
    }

    private suspend fun performDownload(book: Book) {
        updateState(book.id, DownloadState.Downloading(0.0, "Preparando…"))

        try {
            when (book.variant) {
                Variant.Novela -> downloadNovel(book)
                else -> downloadManga(book)
            }
        } catch (cancellation: CancellationException) {
            updateState(book.id, DownloadState.NotDownloaded)
            bookDirectory(book.id).deleteRecursively()
            throw cancellation
        } catch (error: Exception) {
            updateState(book.id, DownloadState.Failed(error.message ?: "Error de descarga"))
            bookDirectory(book.id).deleteRecursively()
        }
    }

    private suspend fun downloadManga(book: Book) {
        val seriePath = book.seriePath ?: throw IllegalStateException("Libro sin ruta")
        val bookPath = book.path ?: throw IllegalStateException("Libro sin ruta")

        val htmlBytes = api.sendBytes(
            Endpoint.get("api/static/mangas/$seriePath/$bookPath.html"),
        )
        val html = htmlBytes.decodeToString()

        val parsed = withContext(Dispatchers.Default) { MokuroParser.parse(html) }

        val directory = bookDirectory(book.id)
        directory.mkdirs()
        localHtmlFile(book.id).writeBytes(htmlBytes)

        var bytes = htmlBytes.size.toLong()
        val pageCount = parsed.pages.size

        parsed.pages.forEachIndexed { index, page ->
            val decodedPath = runCatching { URLDecoder.decode(page.imagePath, "UTF-8") }
                .getOrDefault(page.imagePath)

            val data = api.sendBytes(Endpoint.get("api/static/mangas/$seriePath/$decodedPath"))

            val destination = File(localImagesDirectory(book.id), decodedPath)
            destination.parentFile?.mkdirs()
            destination.writeBytes(data)

            bytes += data.size

            val progress = (index + 1).toDouble() / maxOf(pageCount, 1).toDouble()
            val size = Formatter.formatShortFileSize(context, bytes)
            updateState(
                book.id,
                DownloadState.Downloading(
                    progress = progress,
                    detail = "${index + 1}/$pageCount pág. · $size",
                ),
            )
        }

        finish(
            DownloadRecord(
                bookId = book.id,
                visibleName = book.visibleName,
                variant = book.variant?.name?.lowercase() ?: "manga",
                downloadedAt = System.currentTimeMillis(),
                byteCount = bytes,
                pageCount = pageCount,
            ),
        )
    }

    private suspend fun downloadNovel(book: Book) {
        val seriePath = book.seriePath ?: throw IllegalStateException("Libro sin ruta")
        val bookPath = book.path ?: throw IllegalStateException("Libro sin ruta")

        val data = api.sendBytes(
            Endpoint.get("api/static/novelas/$seriePath/$bookPath.epub"),
        )

        val directory = bookDirectory(book.id)
        directory.mkdirs()
        localEpubFile(book.id).writeBytes(data)

        finish(
            DownloadRecord(
                bookId = book.id,
                visibleName = book.visibleName,
                variant = book.variant?.name?.lowercase() ?: "novela",
                downloadedAt = System.currentTimeMillis(),
                byteCount = data.size.toLong(),
                pageCount = 0,
            ),
        )
    }

    private fun finish(record: DownloadRecord) {
        _records.value = _records.value + (record.bookId to record)
        updateState(record.bookId, DownloadState.Downloaded)
        saveManifest()
    }

    private fun updateState(bookId: String, state: DownloadState) {
        _states.value = _states.value + (bookId to state)
    }

    private val manifestFile: File
        get() = File(rootDir, "manifest.json")

    private fun loadManifest() {
        try {
            if (!manifestFile.exists()) return
            val list = api.json.decodeFromString(
                ListSerializer(DownloadRecord.serializer()),
                manifestFile.readText(),
            )
            _records.value = list.associateBy { it.bookId }
        } catch (_: Exception) {
            // Manifest corrupto: se ignora y se reconstruirá con las siguientes descargas
        }
    }

    private fun saveManifest() {
        try {
            val data = api.json.encodeToString(
                ListSerializer(DownloadRecord.serializer()),
                sortedRecords,
            )
            manifestFile.writeText(data)
        } catch (_: Exception) {
            // Sin espacio o error de E/S: la descarga sigue siendo válida en disco
        }
    }
}
