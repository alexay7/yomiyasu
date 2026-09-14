package es.manabe.yomiyasu.features.novel

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.DownloadDone
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dagger.hilt.android.EntryPointAccessors
import es.manabe.yomiyasu.components.LibraryEntryPoint
import es.manabe.yomiyasu.core.models.Book
import es.manabe.yomiyasu.core.readers.NovelProgressMap
import es.manabe.yomiyasu.core.readers.ReadingTimer
import es.manabe.yomiyasu.core.services.DownloadState
import es.manabe.yomiyasu.core.settings.NovelFont
import es.manabe.yomiyasu.core.settings.NovelTheme
import es.manabe.yomiyasu.core.settings.NovelWritingMode
import es.manabe.yomiyasu.core.settings.ReaderSettingsData
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.readium.r2.navigator.epub.EpubNavigatorFragment
import org.readium.r2.navigator.epub.EpubPreferences
import org.readium.r2.navigator.preferences.ReadingProgression
import org.readium.r2.navigator.preferences.Theme
import org.readium.r2.shared.publication.Link
import org.readium.r2.shared.publication.Locator
import kotlin.math.max
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NovelReaderView(
    initialBookId: String,
    onBack: () -> Unit,
    viewModel: NovelReaderViewModel = hiltViewModel(),
) {
    val loadState by viewModel.state.collectAsStateWithLifecycle()
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()
    val settings by viewModel.settingsData.collectAsStateWithLifecycle()
    val appSettings by viewModel.appSettingsData.collectAsStateWithLifecycle()
    val isOnline by viewModel.isOnline.collectAsStateWithLifecycle()

    val context = LocalContext.current
    val downloads = remember {
        EntryPointAccessors.fromApplication(
            context.applicationContext,
            LibraryEntryPoint::class.java,
        ).downloadManager()
    }
    val downloadStates by downloads.states.collectAsStateWithLifecycle()
    val downloadRecords by downloads.records.collectAsStateWithLifecycle()

    var currentBookId by remember { mutableStateOf(initialBookId) }
    var showingBars by remember { mutableStateOf(true) }
    var showingSettings by remember { mutableStateOf(false) }
    var showingToc by remember { mutableStateOf(false) }
    var dictionary by remember { mutableStateOf<Pair<String, String>?>(null) }
    var alertMessage by remember { mutableStateOf<String?>(null) }
    var navigator by remember { mutableStateOf<EpubNavigatorFragment?>(null) }
    var currentCharacters by remember { mutableIntStateOf(0) }

    val scope = rememberCoroutineScope()
    val timer = remember { ReadingTimer(scope) }
    val timerSeconds by timer.seconds.collectAsStateWithLifecycle()
    val timerRunning by timer.isRunning.collectAsStateWithLifecycle()

    val book = loadState.book
    val publication = loadState.publication
    val progressMap = loadState.progressMap

    LaunchedEffect(currentBookId) {
        showingBars = true
        currentCharacters = 0
        navigator = null
        viewModel.load(currentBookId)
    }

    LaunchedEffect(loadState.book?.id, loadState.startCharacters, loadState.startTime) {
        if (loadState.book != null && loadState.publication != null) {
            currentCharacters = loadState.startCharacters
            timer.resume(fromSeconds = loadState.startTime)
            if (appSettings.autoCrono) timer.start()
        }
    }

    LaunchedEffect(navigator) {
        val fragment = navigator ?: return@LaunchedEffect
        fragment.currentLocator.collect { locator ->
            val map = progressMap ?: return@collect
            val characters = map.characters(
                href = locator.href.toString(),
                progression = locator.locations.progression ?: 0.0,
            )
            if (characters > currentCharacters) {
                currentCharacters = characters
            }
        }
    }

    val totalCharacters = book?.characters ?: progressMap?.totalCharacters ?: 0

    LaunchedEffect(loadState.book?.id) {
        if (loadState.book == null) return@LaunchedEffect

        while (true) {
            delay(60_000)
            book?.let { viewModel.saveProgress(it, currentCharacters, timerSeconds, totalCharacters) }
        }
    }

    LifecycleEventEffect(Lifecycle.Event.ON_STOP) {
        timer.pause()
        book?.let { viewModel.saveProgress(it, currentCharacters, timerSeconds, totalCharacters) }
    }

    LifecycleEventEffect(Lifecycle.Event.ON_START) {
        if (appSettings.autoCrono) timer.start()
    }

    DisposableEffect(Unit) {
        onDispose {
            timer.pause()
            book?.let { viewModel.saveProgress(it, currentCharacters, timerSeconds, totalCharacters) }
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        when {
            isLoading && book == null -> CircularProgressIndicator(
                modifier = Modifier.align(Alignment.Center),
                color = Color.White,
            )

            error != null && book == null -> Column(
                modifier = Modifier.align(Alignment.Center),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text("No se pudo abrir", color = Color.White, fontWeight = FontWeight.Bold)
                Text(error.orEmpty(), color = Color.White, modifier = Modifier.padding(16.dp))
                TextButton(onClick = { viewModel.load(currentBookId) }) {
                    Text("Reintentar", color = Color.White)
                }
            }

            book != null && publication != null -> {
                NovelNavigatorView(
                    publication = publication!!,
                    initialLocator = loadState.initialLocator,
                    preferences = remember(settings) { settings.toEpubPreferences() },
                    onNavigatorReady = { navigator = it },
                    onSelectionLookup = { text ->
                        dictionary = text to text
                    },
                )

                if (showingBars) {
                    Column(modifier = Modifier.fillMaxSize()) {
                        ReaderBar(
                            book = book!!,
                            isDownloaded = downloadRecords.containsKey(currentBookId),
                            downloadState = downloadStates[currentBookId] ?: DownloadState.NotDownloaded,
                            isOnline = isOnline,
                            onBack = {
                                book?.let {
                                    viewModel.saveProgress(it, currentCharacters, timerSeconds, totalCharacters)
                                }
                                onBack()
                            },
                            onDownload = { book?.let { downloads.enqueue(it) } },
                            onOpenToc = { showingToc = true },
                            onOpenSettings = { showingSettings = true },
                        )

                        Spacer(modifier = Modifier.weight(1f))

                        Surface(color = Color.Black.copy(alpha = 0.75f)) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 12.dp, vertical = 6.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    IconButton(onClick = {
                                        book?.let {
                                            viewModel.saveProgress(it, currentCharacters, timerSeconds, totalCharacters)
                                        }
                                        viewModel.neighboringBook(
                                            bookId = currentBookId,
                                            forward = false,
                                            onResult = { neighbor ->
                                                if (neighbor != null) currentBookId = neighbor.id else alertMessage = "No hay más volúmenes"
                                            },
                                            onError = { alertMessage = it },
                                        )
                                    }) {
                                        Icon(Icons.Filled.SkipPrevious, contentDescription = "Volumen anterior", tint = Color.White)
                                    }

                                    if (appSettings.showCrono) {
                                        IconButton(onClick = { if (timerRunning) timer.pause() else timer.start() }) {
                                            Icon(
                                                imageVector = if (timerRunning) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                                                contentDescription = null,
                                                tint = Color.White,
                                            )
                                        }
                                        Text(timer.formatted(), color = Color.White)
                                    }

                                    Spacer(modifier = Modifier.weight(1f))

                                    Text(
                                        text = novelProgressLabel(currentCharacters, totalCharacters),
                                        color = Color.White,
                                        modifier = Modifier.testTag("novelProgressLabel"),
                                    )

                                    IconButton(onClick = {
                                        book?.let {
                                            viewModel.saveProgress(it, currentCharacters, timerSeconds, totalCharacters)
                                        }
                                        viewModel.neighboringBook(
                                            bookId = currentBookId,
                                            forward = true,
                                            onResult = { neighbor ->
                                                if (neighbor != null) currentBookId = neighbor.id else alertMessage = "No hay más volúmenes"
                                            },
                                            onError = { alertMessage = it },
                                        )
                                    }) {
                                        Icon(Icons.Filled.SkipNext, contentDescription = "Volumen siguiente", tint = Color.White)
                                    }
                                }

                                Slider(
                                    value = currentCharacters.toFloat(),
                                    onValueChange = { value ->
                                        currentCharacters = value.roundToInt()
                                        val map = progressMap ?: return@Slider
                                        val pub = publication ?: return@Slider
                                        locatorFor(pub, map, currentCharacters)?.let { locator ->
                                            navigator?.go(locator, animated = false)
                                        }
                                    },
                                    valueRange = 0f..max(totalCharacters, 1).toFloat(),
                                    steps = 0,
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showingSettings) {
        ModalBottomSheet(onDismissRequest = { showingSettings = false }) {
            es.manabe.yomiyasu.features.reader.ReaderSettingsSheet()
        }
    }

    if (showingToc && publication != null) {
        ModalBottomSheet(onDismissRequest = { showingToc = false }) {
            TocSheet(
                links = flattenToc(publication!!.tableOfContents),
                onSelect = { link ->
                    showingToc = false
                    navigator?.go(link, animated = false)
                },
            )
        }
    }

    dictionary?.let { (query, sentence) ->
        ModalBottomSheet(onDismissRequest = { dictionary = null }) {
            es.manabe.yomiyasu.features.reader.DictionaryLookupContent(
                query = query,
                mode = es.manabe.yomiyasu.core.settings.DictionaryLookupMode.Sentence,
                sentence = sentence,
            )
        }
    }

    alertMessage?.let { message ->
        AlertDialog(
            onDismissRequest = { alertMessage = null },
            title = { Text(message) },
            confirmButton = { TextButton(onClick = { alertMessage = null }) { Text("Vale") } },
        )
    }
}

fun novelProgressLabel(characters: Int, total: Int): String {
    if (total <= 0) return "$characters car."
    val percent = (characters.toDouble() / total.toDouble() * 100).coerceIn(0.0, 100.0)

    return String.format("%.0f %%", percent)
}

private fun ReaderSettingsData.toEpubPreferences(): EpubPreferences = EpubPreferences(
    fontSize = novelFontSize,
    fontFamily = when (novelFont) {
        NovelFont.Original -> null
        NovelFont.Serif -> org.readium.r2.navigator.preferences.FontFamily.SERIF
        NovelFont.Sans -> org.readium.r2.navigator.preferences.FontFamily.SANS_SERIF
    },
    theme = when (novelTheme) {
        NovelTheme.System -> null
        NovelTheme.Light -> Theme.LIGHT
        NovelTheme.Dark -> Theme.DARK
        NovelTheme.Sepia -> Theme.SEPIA
    },
    verticalText = when (novelWritingMode) {
        NovelWritingMode.Automatic -> null
        NovelWritingMode.Horizontal -> false
        NovelWritingMode.Vertical -> true
    },
    scroll = novelScroll,
)

private fun flattenToc(links: List<Link>): List<Pair<Link, Int>> {
    val result = mutableListOf<Pair<Link, Int>>()

    fun visit(link: Link, depth: Int) {
        result.add(link to depth)
        link.children.forEach { visit(it, depth + 1) }
    }

    links.forEach { visit(it, 0) }
    return result
}

@Composable
private fun TocSheet(
    links: List<Pair<Link, Int>>,
    onSelect: (Link) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(max = 600.dp)
            .testTag("tocSheet"),
    ) {
        Text(
            text = "Índice",
            style = androidx.compose.material3.MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
        )

        LazyColumn(contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 24.dp)) {
            items(links.size) { index ->
                val (link, depth) = links[index]
                Text(
                    text = link.title ?: link.href.toString(),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = (20 + depth * 16).dp, top = 10.dp, end = 20.dp, bottom = 10.dp),
                    style = androidx.compose.material3.MaterialTheme.typography.bodyMedium,
                )
            }
        }
    }
}

@Composable
private fun ReaderBar(
    book: Book,
    isDownloaded: Boolean,
    downloadState: DownloadState,
    isOnline: Boolean,
    onBack: () -> Unit,
    onDownload: () -> Unit,
    onOpenToc: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    Surface(color = Color.Black.copy(alpha = 0.75f)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = Color.White)
            }

            Text(
                text = book.visibleName,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                modifier = Modifier
                    .weight(1f)
                    .testTag("readerBookTitle"),
            )

            if (!isOnline) {
                Icon(Icons.Filled.WifiOff, contentDescription = "Sin conexión", tint = Color(0xFFFF9800))
            }

            when {
                isDownloaded -> Icon(
                    Icons.Filled.DownloadDone,
                    contentDescription = "Descargado",
                    tint = Color(0xFF4CAF50),
                )

                downloadState is DownloadState.Queued || downloadState is DownloadState.Downloading ->
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White)

                else -> IconButton(onClick = onDownload) {
                    Icon(Icons.Filled.Download, contentDescription = "Descargar", tint = Color.White)
                }
            }

            IconButton(onClick = onOpenToc) {
                Icon(Icons.AutoMirrored.Filled.List, contentDescription = "Índice", tint = Color.White)
            }

            IconButton(onClick = onOpenSettings) {
                Icon(Icons.Filled.Settings, contentDescription = "Ajustes", tint = Color.White)
            }
        }
    }
}
