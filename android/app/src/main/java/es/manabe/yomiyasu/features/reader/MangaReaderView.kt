package es.manabe.yomiyasu.features.reader

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.DownloadDone
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material.icons.filled.TextFields
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
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dagger.hilt.android.EntryPointAccessors
import es.manabe.yomiyasu.components.LibraryEntryPoint
import es.manabe.yomiyasu.core.mokuro.MokuroBook
import es.manabe.yomiyasu.core.mokuro.MokuroTextBox
import es.manabe.yomiyasu.core.models.Book
import es.manabe.yomiyasu.core.readers.MokuroTextHit
import es.manabe.yomiyasu.core.readers.ReaderSpread
import es.manabe.yomiyasu.core.readers.ReadingTimer
import es.manabe.yomiyasu.core.readers.SpreadLayout
import es.manabe.yomiyasu.core.readers.TategakiLayout
import es.manabe.yomiyasu.core.services.DownloadState
import es.manabe.yomiyasu.core.settings.DictionaryLookupMode
import es.manabe.yomiyasu.core.settings.ReaderSettingsData
import es.manabe.yomiyasu.core.settings.ZoomMode
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.max
import kotlin.math.roundToInt

data class DictionaryRequest(
    val query: String,
    val sentence: String,
    val mode: DictionaryLookupMode,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MangaReaderView(
    initialBookId: String,
    onBack: () -> Unit,
    viewModel: MangaReaderViewModel = hiltViewModel(),
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
    var showingPageText by remember { mutableStateOf(false) }
    var selectedBoxId by remember { mutableIntStateOf(-1) }
    var dictionary by remember { mutableStateOf<DictionaryRequest?>(null) }
    var alertMessage by remember { mutableStateOf<String?>(null) }

    val scope = rememberCoroutineScope()
    val timer = remember { ReadingTimer(scope) }
    val timerSeconds by timer.seconds.collectAsStateWithLifecycle()
    val timerRunning by timer.isRunning.collectAsStateWithLifecycle()

    val book = loadState.book
    val mokuro = loadState.mokuro

    val spreads = remember(mokuro, settings.doublePage, settings.hasCover) {
        mokuro?.let {
            SpreadLayout.spreads(
                pageCount = it.pages.size,
                doublePage = settings.doublePage,
                hasCover = settings.hasCover,
            )
        } ?: emptyList()
    }

    val pagerState = rememberPagerState(pageCount = { spreads.size })

    LaunchedEffect(currentBookId) {
        selectedBoxId = -1
        showingBars = true
        viewModel.load(currentBookId)
    }

    LaunchedEffect(loadState.book?.id, loadState.startPage, loadState.startTime, mokuro) {
        if (mokuro != null && loadState.book != null && spreads.isNotEmpty()) {
            val target = SpreadLayout.spreadIndex(
                page = loadState.startPage,
                doublePage = settings.doublePage,
                hasCover = settings.hasCover,
            ).coerceIn(0, spreads.size - 1)

            if (pagerState.currentPage != target) {
                pagerState.scrollToPage(target)
            }

            timer.resume(fromSeconds = loadState.startTime)
            if (appSettings.autoCrono) timer.start()
        }
    }

    val currentPageNumber: Int = spreads.getOrNull(pagerState.currentPage)?.firstPage?.plus(1) ?: 1
    val totalPages = mokuro?.pages?.size ?: 0

    // Página (0-based) de referencia para conservar la posición de lectura al
    // cambiar «doble página» o «portada»: sin esto el pager mantiene el índice
    // del spread y salta a otra página.
    val anchorPage = remember { mutableIntStateOf(0) }

    LaunchedEffect(loadState.book?.id, loadState.startPage) {
        anchorPage.intValue = loadState.startPage
    }

    LaunchedEffect(spreads) {
        if (spreads.isEmpty()) return@LaunchedEffect

        val target = SpreadLayout.spreadIndex(
            page = anchorPage.intValue,
            doublePage = settings.doublePage,
            hasCover = settings.hasCover,
        ).coerceIn(0, spreads.size - 1)

        if (pagerState.currentPage != target) {
            pagerState.scrollToPage(target)
        }
    }

    LaunchedEffect(pagerState, spreads) {
        snapshotFlow { pagerState.currentPage }.collect { index ->
            spreads.getOrNull(index)?.firstPage?.let { anchorPage.intValue = it }
        }
    }

    LaunchedEffect(spreads.size) {
        if (spreads.isEmpty()) return@LaunchedEffect

        while (true) {
            delay(60_000)
            book?.let { viewModel.saveProgress(it, currentPageNumber, timerSeconds) }
        }
    }

    LaunchedEffect(appSettings.idleTimeout) {
        timer.idleTimeoutMinutes = appSettings.idleTimeout
    }

    LaunchedEffect(pagerState.currentPage) {
        timer.notifyActivity()
    }

    LifecycleEventEffect(Lifecycle.Event.ON_STOP) {
        timer.pause()
        book?.let { viewModel.saveProgress(it, currentPageNumber, timerSeconds) }
    }

    LifecycleEventEffect(Lifecycle.Event.ON_START) {
        if (appSettings.autoCrono) timer.start()
    }

    DisposableEffect(Unit) {
        onDispose {
            timer.pause()
            book?.let { viewModel.saveProgress(it, currentPageNumber, timerSeconds) }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
    ) {
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

            book != null && mokuro != null -> {
                ReaderPager(
                    book = book!!,
                    mokuro = mokuro!!,
                    settings = settings,
                    spreads = spreads,
                    pagerState = pagerState,
                    selectedBoxId = selectedBoxId,
                    isImageFolder = book!!.isImageFolder,
                    imageModel = { imagePath -> viewModel.imageModel(book!!, imagePath) },
                    onBoxTap = { box, hit ->
                        if (selectedBoxId == box.id && settings.nativeDictionary) {
                            val paragraph = box.paragraphs.getOrNull(hit.paragraphIndex)?.text.orEmpty()
                            val query = when (settings.dictionaryVersion) {
                                DictionaryLookupMode.Word -> TategakiLayout
                                    .codePoints(paragraph)
                                    .drop(hit.characterIndex)
                                    .joinToString("")

                                DictionaryLookupMode.Sentence -> paragraph
                            }
                            dictionary = DictionaryRequest(
                                query = query.ifEmpty { paragraph },
                                sentence = paragraph,
                                mode = settings.dictionaryVersion,
                            )
                        } else {
                            selectedBoxId = box.id
                        }
                    },
                    onToggleBars = { showingBars = !showingBars },
                    onNavigate = { forward ->
                        scope.launch {
                            val target = if (forward) {
                                (pagerState.currentPage + 1).coerceAtMost(max(spreads.size - 1, 0))
                            } else {
                                (pagerState.currentPage - 1).coerceAtLeast(0)
                            }
                            pagerState.animateScrollToPage(target)
                        }
                    },
                )

                if (showingBars) {
                    Column(modifier = Modifier.fillMaxSize()) {
                        ReaderTopBar(
                            book = book!!,
                            isDownloaded = downloadRecords.containsKey(currentBookId),
                            downloadState = downloadStates[currentBookId] ?: DownloadState.NotDownloaded,
                            isOnline = isOnline,
                            showTextButton = !book!!.isImageFolder,
                            onBack = {
                                book?.let { viewModel.saveProgress(it, currentPageNumber, timerSeconds) }
                                onBack()
                            },
                            onDownload = { book?.let { downloads.enqueue(it) } },
                            onOpenText = { showingPageText = true },
                            onOpenSettings = { showingSettings = true },
                        )

                        Spacer(modifier = Modifier.weight(1f))

                        ReaderBottomBar(
                            pageNumber = currentPageNumber,
                            totalPages = totalPages,
                            spreadIndex = pagerState.currentPage,
                            spreadCount = spreads.size,
                            timerText = timer.formatted(),
                            timerRunning = timerRunning,
                            showCrono = appSettings.showCrono,
                            onToggleTimer = { if (timerRunning) timer.pause() else timer.start() },
                            onPrevVolume = {
                                book?.let { viewModel.saveProgress(it, currentPageNumber, timerSeconds) }
                                viewModel.neighboringBook(
                                    bookId = currentBookId,
                                    forward = false,
                                    onResult = { neighbor ->
                                        if (neighbor != null) {
                                            currentBookId = neighbor.id
                                        } else {
                                            alertMessage = "No hay más volúmenes"
                                        }
                                    },
                                    onError = { alertMessage = it },
                                )
                            },
                            onNextVolume = {
                                book?.let { viewModel.saveProgress(it, currentPageNumber, timerSeconds) }
                                viewModel.neighboringBook(
                                    bookId = currentBookId,
                                    forward = true,
                                    onResult = { neighbor ->
                                        if (neighbor != null) {
                                            currentBookId = neighbor.id
                                        } else {
                                            alertMessage = "No hay más volúmenes"
                                        }
                                    },
                                    onError = { alertMessage = it },
                                )
                            },
                            onSeek = { index ->
                                scope.launch { pagerState.scrollToPage(index) }
                            },
                        )
                    }
                }
            }
        }
    }

    if (showingSettings) {
        ModalBottomSheet(onDismissRequest = { showingSettings = false }) {
            ReaderSettingsSheet(showOCR = book?.isImageFolder != true)
        }
    }

    if (showingPageText && mokuro != null) {
        ModalBottomSheet(onDismissRequest = { showingPageText = false }) {
            PageTextSheet(
                pages = spreads.getOrNull(pagerState.currentPage)
                    ?.pages
                    ?.mapNotNull { mokuro?.pages?.getOrNull(it) }
                    .orEmpty(),
                onOpenDictionary = { paragraph ->
                    dictionary = DictionaryRequest(
                        query = paragraph.take(30),
                        sentence = paragraph,
                        mode = DictionaryLookupMode.Sentence,
                    )
                },
            )
        }
    }

    dictionary?.let { request ->
        ModalBottomSheet(onDismissRequest = { dictionary = null }) {
            DictionaryLookupContent(
                query = request.query,
                mode = request.mode,
                sentence = request.sentence,
            )
        }
    }

    alertMessage?.let { message ->
        AlertDialog(
            onDismissRequest = { alertMessage = null },
            title = { Text(message) },
            confirmButton = {
                TextButton(onClick = { alertMessage = null }) { Text("Vale") }
            },
        )
    }
}

@Composable
private fun ReaderPager(
    book: Book,
    mokuro: MokuroBook,
    settings: ReaderSettingsData,
    spreads: List<ReaderSpread>,
    pagerState: PagerState,
    selectedBoxId: Int,
    isImageFolder: Boolean,
    imageModel: (String) -> Any,
    onBoxTap: (MokuroTextBox, MokuroTextHit) -> Unit,
    onToggleBars: () -> Unit,
    onNavigate: (Boolean) -> Unit,
) {
    var zoom by remember { mutableFloatStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }
    var containerSize by remember { mutableStateOf(IntSize.Zero) }

    // Proporción aprendida de cada imagen de un tomo sin mokuro (no tiene
    // dimensiones en los datos): permite maquetar el spread como un bloque
    val imageAspects = remember { mutableStateMapOf<Int, Float>() }

    val keepZoom = settings.defaultZoomMode == ZoomMode.Keep

    LaunchedEffect(pagerState.currentPage, spreads.size) {
        if (!keepZoom) {
            zoom = 1f
            offset = Offset.Zero
        }
    }

    HorizontalPager(
        state = pagerState,
        reverseLayout = settings.r2l,
        userScrollEnabled = settings.scrollChange,
        modifier = Modifier
            .fillMaxSize()
            .onSizeChanged { containerSize = it }
            .pointerInput(settings.panAndZoom) {
                if (settings.panAndZoom) {
                    detectTransformGestures { _, pan, gestureZoom, _ ->
                        val newZoom = (zoom * gestureZoom).coerceIn(1f, 6f)
                        zoom = newZoom
                        offset = if (newZoom <= 1.001f) {
                            Offset.Zero
                        } else {
                            val maxX = (containerSize.width * (newZoom - 1f)) / 2f
                            val maxY = (containerSize.height * (newZoom - 1f)) / 2f
                            Offset(
                                x = (offset.x + pan.x).coerceIn(-maxX, maxX),
                                y = (offset.y + pan.y).coerceIn(-maxY, maxY),
                            )
                        }
                    }
                }
            },
    ) { pageIndex ->
        val spread = spreads.getOrNull(pageIndex) ?: return@HorizontalPager

        Box(
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer(
                    scaleX = zoom,
                    scaleY = zoom,
                    translationX = offset.x,
                    translationY = offset.y,
                ),
            contentAlignment = Alignment.Center,
        ) {
            CompositionLocalProvider(
                LocalLayoutDirection provides if (settings.r2l) LayoutDirection.Rtl else LayoutDirection.Ltr,
            ) {
                BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
                    val fitMode = settings.defaultZoomMode.takeIf { it != ZoomMode.Keep }
                        ?: ZoomMode.FitScreen
                    val handlePageTap: (Offset) -> Unit = { position ->
                        if (zoom <= 1.001f && containerSize.width > 0) {
                            val third = containerSize.width / 3f
                            when {
                                position.x < third -> onNavigate(!settings.r2l)
                                position.x > 2 * third -> onNavigate(settings.r2l)
                                else -> onToggleBars()
                            }
                        }
                    }

                    // En "ajustar a pantalla" (y "mantener zoom") las páginas
                    // del spread se escalan como un bloque para que queden
                    // juntas y centradas, como en el lector de iOS. En el resto
                    // de modos cada página ocupa su mitad con scroll propio.
                    val aspects = spread.pages.map { pageNumber ->
                        val page = mokuro.pages.getOrNull(pageNumber)
                        when {
                            page == null -> null
                            page.size.width > 0f && page.size.height > 0f ->
                                page.size.width / page.size.height
                            else -> imageAspects[pageNumber]
                        }
                    }
                    val groupLayout = settings.defaultZoomMode == ZoomMode.FitScreen ||
                        settings.defaultZoomMode == ZoomMode.Keep
                    val totalAspect = aspects
                        .takeIf { groupLayout && it.all { aspect -> aspect != null && aspect > 0f } }
                        ?.filterNotNull()
                        ?.sum()
                    val pageHeight = totalAspect?.let { minOf(maxHeight, maxWidth / it) }

                    Row(
                        modifier = Modifier.fillMaxSize(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        spread.pages.forEachIndexed { index, pageNumber ->
                            val page = mokuro.pages.getOrNull(pageNumber) ?: return@forEachIndexed
                            val aspect = aspects.getOrNull(index)

                            val pageModifier = if (pageHeight != null && aspect != null) {
                                Modifier
                                    .height(pageHeight)
                                    .width(pageHeight * aspect)
                            } else {
                                Modifier.weight(1f).fillMaxSize()
                            }

                            if (isImageFolder) {
                                ImagePageView(
                                    page = page,
                                    imageModel = imageModel(page.imagePath),
                                    fitMode = fitMode,
                                    onPageTap = handlePageTap,
                                    onIntrinsicSize = { learned -> imageAspects[pageNumber] = learned },
                                    modifier = pageModifier,
                                )
                            } else {
                                MokuroPageView(
                                    page = page,
                                    imageModel = imageModel(page.imagePath),
                                    fitMode = fitMode,
                                    fontSizeOverride = settings.fontSize.toFloat(),
                                    displayOCR = settings.displayOCR,
                                    textBoxBorders = settings.textBoxBorders,
                                    selectedBoxId = selectedBoxId.takeIf { it >= 0 },
                                    font = settings.font,
                                    boxTapsEnabled = settings.toggleOCRTextBoxes,
                                    onBoxTap = { box, hit, _ -> onBoxTap(box, hit) },
                                    onPageTap = handlePageTap,
                                    modifier = pageModifier,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ReaderTopBar(
    book: Book,
    isDownloaded: Boolean,
    downloadState: DownloadState,
    isOnline: Boolean,
    showTextButton: Boolean,
    onBack: () -> Unit,
    onDownload: () -> Unit,
    onOpenText: () -> Unit,
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
                Icon(
                    Icons.Filled.WifiOff,
                    contentDescription = "Sin conexión: no se guarda el progreso",
                    tint = Color(0xFFFF9800),
                )
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

            if (showTextButton) {
                IconButton(onClick = onOpenText) {
                    Icon(Icons.Filled.TextFields, contentDescription = "Texto", tint = Color.White)
                }
            }

            IconButton(onClick = onOpenSettings) {
                Icon(Icons.Filled.Settings, contentDescription = "Ajustes", tint = Color.White)
            }
        }
    }
}

@Composable
private fun ReaderBottomBar(
    pageNumber: Int,
    totalPages: Int,
    spreadIndex: Int,
    spreadCount: Int,
    timerText: String,
    timerRunning: Boolean,
    showCrono: Boolean,
    onToggleTimer: () -> Unit,
    onPrevVolume: () -> Unit,
    onNextVolume: () -> Unit,
    onSeek: (Int) -> Unit,
) {
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
                IconButton(onClick = onPrevVolume) {
                    Icon(Icons.Filled.SkipPrevious, contentDescription = "Volumen anterior", tint = Color.White)
                }

                if (showCrono) {
                    IconButton(onClick = onToggleTimer) {
                        Icon(
                            imageVector = if (timerRunning) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                            contentDescription = if (timerRunning) "Pausar cronómetro" else "Iniciar cronómetro",
                            tint = Color.White,
                        )
                    }

                    Text(text = timerText, color = Color.White)
                }

                Spacer(modifier = Modifier.weight(1f))

                Text(
                    text = "$pageNumber / $totalPages",
                    color = Color.White,
                    modifier = Modifier.testTag("readerPageLabel"),
                )

                IconButton(onClick = onNextVolume) {
                    Icon(Icons.Filled.SkipNext, contentDescription = "Volumen siguiente", tint = Color.White)
                }
            }

            Slider(
                value = spreadIndex.toFloat(),
                onValueChange = { onSeek(it.roundToInt()) },
                valueRange = 0f..max(spreadCount - 1, 0).toFloat(),
                steps = 0,
                modifier = Modifier.testTag("readerSlider"),
            )
        }
    }
}
