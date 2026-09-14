package es.manabe.yomiyasu.features.reader

import es.manabe.yomiyasu.app.DebugConfig
import es.manabe.yomiyasu.core.di.ApplicationScope
import es.manabe.yomiyasu.core.mokuro.MokuroBook
import es.manabe.yomiyasu.core.mokuro.MokuroParser
import es.manabe.yomiyasu.core.models.Book
import es.manabe.yomiyasu.core.networking.ApiClient
import es.manabe.yomiyasu.core.networking.ApiException
import es.manabe.yomiyasu.core.networking.Endpoint
import es.manabe.yomiyasu.core.readers.ProgressMirror
import es.manabe.yomiyasu.core.services.DownloadManager
import es.manabe.yomiyasu.core.services.LibraryApi
import es.manabe.yomiyasu.core.services.NetworkMonitor
import es.manabe.yomiyasu.core.services.ProgressApi
import es.manabe.yomiyasu.core.services.ReadProgressRequest
import es.manabe.yomiyasu.core.services.StaticUrls
import es.manabe.yomiyasu.core.settings.AppSettings
import es.manabe.yomiyasu.core.settings.AppSettingsData
import es.manabe.yomiyasu.core.settings.ReaderSettings
import es.manabe.yomiyasu.core.settings.ReaderSettingsData
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.net.URLDecoder
import javax.inject.Inject

data class ReaderLoadState(
    val book: Book? = null,
    val mokuro: MokuroBook? = null,
    val startPage: Int = 0,
    val startTime: Int = 0,
    val localImagesDir: File? = null,
)

@dagger.hilt.android.lifecycle.HiltViewModel
class MangaReaderViewModel @Inject constructor(
    private val library: LibraryApi,
    private val api: ApiClient,
    private val downloads: DownloadManager,
    private val progress: ProgressApi,
    private val mirror: ProgressMirror,
    settings: ReaderSettings,
    appSettings: AppSettings,
    private val network: NetworkMonitor,
    private val staticUrls: StaticUrls,
    @ApplicationScope private val scope: CoroutineScope,
) : androidx.lifecycle.ViewModel() {

    private val _state = MutableStateFlow(ReaderLoadState())
    val state: StateFlow<ReaderLoadState> = _state.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    val settingsData: StateFlow<ReaderSettingsData> = settings.flow
    val appSettingsData: StateFlow<AppSettingsData> = appSettings.flow
    val isOnline: StateFlow<Boolean> = network.isOnline

    fun load(bookId: String) {
        scope.launch {
            _isLoading.value = true
            _error.value = null

            try {
                val book = library.book(bookId)

                val record = downloads.records.value[bookId]
                val (htmlData, localImagesDir) = if (record != null) {
                    downloads.localHtmlFile(bookId).readBytes() to downloads.localImagesDirectory(bookId)
                } else {
                    val folder = if (book.variant?.name.equals("Novela", ignoreCase = true)) "novelas" else "mangas"
                    val path = "$folder/${book.seriePath.orEmpty()}/${book.path.orEmpty()}.html"
                    api.sendBytes(Endpoint.get("api/static/$path")) to null
                }

                val parsed = withContext(Dispatchers.Default) {
                    MokuroParser.parse(htmlData.decodeToString())
                }

                val progressRecord = runCatching { progress.progressForBook(bookId) }.getOrNull()
                val mirrorPage = mirror.mangaPage(bookId)
                val mirrorTime = mirror.mangaTime(bookId)

                val startPage: Int
                val startTime: Int

                val overridePage = DebugConfig.e2ePage?.minus(1)
                if (overridePage != null && overridePage > 0) {
                    startPage = overridePage
                    startTime = progressRecord?.time ?: mirrorTime
                } else if (progressRecord != null) {
                    startPage = ((progressRecord.currentPage ?: 1) - 1).coerceAtLeast(0)
                    startTime = progressRecord.time ?: 0
                } else {
                    startPage = ((if (mirrorPage == 0) 1 else mirrorPage) - 1).coerceAtLeast(0)
                    startTime = mirrorTime
                }

                _state.value = ReaderLoadState(
                    book = book,
                    mokuro = parsed,
                    startPage = startPage,
                    startTime = startTime,
                    localImagesDir = localImagesDir,
                )
            } catch (error: ApiException) {
                _error.value = error.userMessage
            } catch (error: Exception) {
                _error.value = "No se pudo abrir el libro."
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun imageModel(book: Book, imagePath: String): Any {
        val decodedPath = runCatching { URLDecoder.decode(imagePath, "UTF-8") }.getOrDefault(imagePath)
        val localDir = _state.value.localImagesDir

        return if (localDir != null) {
            File(localDir, decodedPath)
        } else {
            staticUrls.bookImage(book, decodedPath)?.toString().orEmpty()
        }
    }

    fun saveProgress(book: Book, page: Int, timeSeconds: Int) {
        if (DebugConfig.e2eNoSave) return

        mirror.setMangaPage(book.id, page)
        mirror.setMangaTime(book.id, timeSeconds)

        if (!network.isOnline.value) return

        scope.launch {
            val characters = book.pageChars?.getOrNull(page - 1) ?: 0
            val totalPages = book.pages ?: 0
            val status = if (totalPages > 0 && page >= totalPages) "completed" else "reading"

            runCatching {
                progress.save(
                    ReadProgressRequest(
                        book = book.id,
                        time = timeSeconds,
                        currentPage = page,
                        characters = characters,
                        status = status,
                    ),
                )
            }
        }
    }

    fun neighboringBook(
        bookId: String,
        forward: Boolean,
        onResult: (Book?) -> Unit,
        onError: (String) -> Unit,
    ) {
        scope.launch {
            try {
                onResult(progress.neighboringBook(bookId, forward))
            } catch (error: ApiException) {
                onError(error.userMessage)
            }
        }
    }
}
