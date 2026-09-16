package es.manabe.yomiyasu.features.novel

import es.manabe.yomiyasu.app.ServerConfig
import es.manabe.yomiyasu.core.di.ApplicationScope
import es.manabe.yomiyasu.core.models.Book
import es.manabe.yomiyasu.core.networking.ApiClient
import es.manabe.yomiyasu.core.networking.ApiException
import es.manabe.yomiyasu.core.networking.Endpoint
import es.manabe.yomiyasu.core.readers.NovelProgressMap
import es.manabe.yomiyasu.core.readers.ProgressMirror
import es.manabe.yomiyasu.core.readers.ReadiumAccess
import es.manabe.yomiyasu.core.services.DownloadManager
import es.manabe.yomiyasu.core.services.LibraryApi
import es.manabe.yomiyasu.core.services.NetworkMonitor
import es.manabe.yomiyasu.core.services.ProgressApi
import es.manabe.yomiyasu.core.services.ReadProgressRequest
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
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.publication.Publication
import java.io.File
import javax.inject.Inject

data class NovelLoadState(
    val book: Book? = null,
    val publication: Publication? = null,
    val progressMap: NovelProgressMap? = null,
    val initialLocator: Locator? = null,
    val startCharacters: Int = 0,
    val startTime: Int = 0,
)

@dagger.hilt.android.lifecycle.HiltViewModel
class NovelReaderViewModel @Inject constructor(
    @dagger.hilt.android.qualifiers.ApplicationContext private val context: android.content.Context,
    private val library: LibraryApi,
    private val api: ApiClient,
    private val downloads: DownloadManager,
    private val progress: ProgressApi,
    private val mirror: ProgressMirror,
    private val readium: ReadiumAccess,
    settings: ReaderSettings,
    appSettings: AppSettings,
    private val network: NetworkMonitor,
    @ApplicationScope private val scope: CoroutineScope,
) : androidx.lifecycle.ViewModel() {

    private val _state = MutableStateFlow(NovelLoadState())
    val state: StateFlow<NovelLoadState> = _state.asStateFlow()

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
            _state.value = NovelLoadState()

            try {
                val book = library.book(bookId)

                val epubFile = if (downloads.isDownloaded(bookId)) {
                    downloads.localEpubFile(bookId)
                } else {
                    val folder = if (book.variant?.name.equals("Manga", ignoreCase = true)) "mangas" else "novelas"
                    val path = "$folder/${book.seriePath.orEmpty()}/${book.path.orEmpty()}.epub"
                    val bytes = api.sendBytes(Endpoint.get("api/static/$path"))
                    val target = File(context.cacheDir, "yomiyasu-novel-$bookId.epub")
                    target.writeBytes(bytes)
                    target
                }

                val publication = readium.open(epubFile)
                    ?: throw IllegalStateException("No se pudo abrir el EPUB")

                val map = withContext(Dispatchers.Default) { buildProgressMap(publication) }

                val progressRecord = runCatching { progress.progressForBook(bookId) }.getOrNull()
                val startCharacters = progressRecord?.characters
                    ?: mirror.novelCharacters(bookId)
                val startTime = progressRecord?.time ?: mirror.novelTime(bookId)

                val overrideCharacters = ServerConfig.e2eCharacters

                _state.value = NovelLoadState(
                    book = book,
                    publication = publication,
                    progressMap = map,
                    initialLocator = locatorFor(
                        publication = publication,
                        map = map,
                        characters = overrideCharacters ?: startCharacters,
                    ),
                    startCharacters = overrideCharacters ?: startCharacters,
                    startTime = startTime,
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

    fun saveProgress(book: Book, characters: Int, timeSeconds: Int, totalCharacters: Int) {
        if (ServerConfig.e2eNoSave) return
        if (characters <= 0 && timeSeconds <= 0) return

        mirror.setNovelCharacters(book.id, characters)
        mirror.setNovelTime(book.id, timeSeconds)

        if (!network.isOnline.value) return

        scope.launch {
            val total = if ((book.characters ?: 0) > 0) book.characters ?: 0 else totalCharacters
            val isCompleted = total > 0 && characters.toDouble() >= total.toDouble() * 0.9

            runCatching {
                progress.save(
                    ReadProgressRequest(
                        book = book.id,
                        time = timeSeconds,
                        currentPage = 1,
                        characters = characters,
                        status = if (isCompleted) "completed" else "reading",
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

    @OptIn(org.readium.r2.shared.InternalReadiumApi::class)
    private suspend fun buildProgressMap(publication: Publication): NovelProgressMap {
        var cumulative = 0
        var containsVertical = false
        val entries = mutableListOf<NovelProgressMap.Entry>()

        for (link in publication.readingOrder) {
            val url = publication.url(link) ?: continue
            val resource = publication.container[url] ?: continue
            val bytes = resource.read().getOrNull() ?: continue

            val html = bytes.decodeToString()
            if (NovelProgressMap.containsVerticalWriting(html)) containsVertical = true

            val count = NovelProgressMap.japaneseCharacterCount(html)
            entries.add(
                NovelProgressMap.Entry(
                    href = link.href.toString(),
                    mediaType = link.mediaType?.toString().orEmpty(),
                    characters = count,
                    cumulativeBefore = cumulative,
                ),
            )
            cumulative += count
        }

        for (link in publication.resources) {
            val mediaType = link.mediaType?.toString().orEmpty()
            if (!mediaType.contains("css", ignoreCase = true)) continue

            val url = publication.url(link) ?: continue
            val resource = publication.container[url] ?: continue
            val bytes = resource.read().getOrNull() ?: continue

            if (NovelProgressMap.containsVerticalWriting(bytes.decodeToString())) {
                containsVertical = true
                break
            }
        }

        return NovelProgressMap(entries = entries, containsVerticalText = containsVertical)
    }
}
