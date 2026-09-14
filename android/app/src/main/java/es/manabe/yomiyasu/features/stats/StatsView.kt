package es.manabe.yomiyasu.features.stats

import androidx.activity.compose.LocalOnBackPressedDispatcherOwner
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.LibraryBooks
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.CollectionsBookmark
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.TextFields
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
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
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import es.manabe.yomiyasu.app.ui.theme.LocalYomiyasuColors
import es.manabe.yomiyasu.components.ErrorBox
import es.manabe.yomiyasu.components.LoadingBox
import es.manabe.yomiyasu.components.durationText
import es.manabe.yomiyasu.components.formatNumber
import es.manabe.yomiyasu.core.models.MonthlyGraphEntry
import es.manabe.yomiyasu.core.models.MonthlyGraphs
import es.manabe.yomiyasu.core.models.UserStats
import es.manabe.yomiyasu.core.models.Variant
import es.manabe.yomiyasu.core.networking.ApiException
import es.manabe.yomiyasu.core.services.ProgressApi
import es.manabe.yomiyasu.core.services.SocketService
import es.manabe.yomiyasu.core.settings.AppSettings
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.Month
import java.time.format.TextStyle
import java.util.Locale
import javax.inject.Inject
import kotlin.math.roundToInt

private val statsLocale: Locale = Locale("es", "ES")

private enum class StatsChartMode(val title: String) {
    Hours("Horas"),
    Speed("Velocidad"),
}

private data class StatItem(
    val title: String,
    val value: String,
    val icon: ImageVector,
)

@HiltViewModel
class StatsViewModel @Inject constructor(
    private val progress: ProgressApi,
    private val settings: AppSettings,
    socket: SocketService,
) : ViewModel() {

    data class UiState(
        val stats: UserStats? = null,
        val graphs: MonthlyGraphs? = null,
        val isLoading: Boolean = true,
        val error: String? = null,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    val libraryUpdatedAt: StateFlow<Long?> = socket.libraryUpdatedAt

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }

            try {
                coroutineScope {
                    val statsRequest = async { progress.stats() }
                    val graphsRequest = async { progress.graphs() }

                    val stats = statsRequest.await()
                    val graphs = graphsRequest.await()

                    _state.update {
                        it.copy(stats = stats, graphs = graphs, isLoading = false)
                    }

                    if (stats.totalTimeRead > 0) {
                        settings.setMeanCharactersPerHour(
                            stats.totalCharacters / (stats.totalTimeRead / 60.0),
                        )
                    }
                }
            } catch (error: Exception) {
                _state.update {
                    it.copy(isLoading = false, error = statsErrorMessage(error))
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StatsRoute(
    viewModel: StatsViewModel = hiltViewModel(),
    onBack: (() -> Unit)? = null,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val libraryUpdatedAt by viewModel.libraryUpdatedAt.collectAsStateWithLifecycle()

    var selectedVariant by remember { mutableStateOf(Variant.Manga) }
    var chartMode by remember { mutableStateOf(StatsChartMode.Hours) }

    val backDispatcher = LocalOnBackPressedDispatcherOwner.current?.onBackPressedDispatcher
    val backAction: (() -> Unit)? = onBack ?: backDispatcher?.let { dispatcher ->
        { dispatcher.onBackPressed() }
    }

    val stats = state.stats
    val error = state.error

    LaunchedEffect(libraryUpdatedAt) {
        if (libraryUpdatedAt != null) viewModel.load()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Estadísticas") },
                navigationIcon = {
                    if (backAction != null) {
                        IconButton(onClick = backAction) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Volver",
                            )
                        }
                    }
                },
            )
        },
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            when {
                state.isLoading && stats == null -> LoadingBox()

                error != null && stats == null -> ErrorBox(
                    message = error,
                    onRetry = viewModel::load,
                )

                else -> Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp)
                        .testTag("statsContent"),
                    verticalArrangement = Arrangement.spacedBy(22.dp),
                ) {
                    stats?.let { StatCards(it) }

                    ChartSection(
                        graphs = state.graphs,
                        variant = selectedVariant,
                        chartMode = chartMode,
                        onVariantChange = { selectedVariant = it },
                        onChartModeChange = { chartMode = it },
                    )
                }
            }
        }
    }
}

@Composable
private fun StatCards(stats: UserStats) {
    val items = listOf(
        StatItem(
            title = "Mangas leídos",
            value = formatNumber(stats.totalMangaBooks),
            icon = Icons.Filled.Book,
        ),
        StatItem(
            title = "Novelas leídas",
            value = formatNumber(stats.totalNovelaBooks),
            icon = Icons.AutoMirrored.Filled.MenuBook,
        ),
        StatItem(
            title = "Series de manga",
            value = formatNumber(stats.totalMangaSeries),
            icon = Icons.AutoMirrored.Filled.LibraryBooks,
        ),
        StatItem(
            title = "Series de novela",
            value = formatNumber(stats.totalNovelaSeries),
            icon = Icons.Filled.CollectionsBookmark,
        ),
        StatItem(
            title = "Páginas leídas",
            value = formatNumber(stats.totalPagesRead),
            icon = Icons.Filled.Description,
        ),
        StatItem(
            title = "Caracteres",
            value = formatNumber(stats.totalCharacters),
            icon = Icons.Filled.TextFields,
        ),
        StatItem(
            title = "Tiempo total",
            value = durationText((stats.totalTimeRead * 60).roundToInt()),
            icon = Icons.Filled.Schedule,
        ),
        StatItem(
            title = "Velocidad media",
            value = speedText(stats),
            icon = Icons.Filled.Speed,
        ),
    )

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        items.chunked(2).forEach { pair ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                pair.forEach { item ->
                    StatCard(item = item, modifier = Modifier.weight(1f))
                }
                if (pair.size == 1) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun StatCard(
    item: StatItem,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(
            imageVector = item.icon,
            contentDescription = null,
            tint = LocalYomiyasuColors.current.accent,
            modifier = Modifier.size(20.dp),
        )
        Text(
            text = item.value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            text = item.title,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChartSection(
    graphs: MonthlyGraphs?,
    variant: Variant,
    chartMode: StatsChartMode,
    onVariantChange: (Variant) -> Unit,
    onChartModeChange: (StatsChartMode) -> Unit,
) {
    val variantOptions = listOf(Variant.Manga to "Manga", Variant.Novela to "Novelas")

    val entries = remember(graphs, variant) {
        val source = if (variant == Variant.Manga) graphs?.manga else graphs?.novela
        source.orEmpty().sortedWith(compareBy({ it.monthId.year }, { it.monthId.month }))
    }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            text = "Actividad mensual",
            style = MaterialTheme.typography.titleMedium,
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            SingleChoiceSegmentedButtonRow(modifier = Modifier.weight(1f)) {
                variantOptions.forEachIndexed { index, (option, label) ->
                    SegmentedButton(
                        selected = variant == option,
                        onClick = { onVariantChange(option) },
                        shape = SegmentedButtonDefaults.itemShape(
                            index = index,
                            count = variantOptions.size,
                        ),
                    ) {
                        Text(label)
                    }
                }
            }

            SingleChoiceSegmentedButtonRow(modifier = Modifier.weight(1f)) {
                StatsChartMode.entries.forEachIndexed { index, mode ->
                    SegmentedButton(
                        selected = chartMode == mode,
                        onClick = { onChartModeChange(mode) },
                        shape = SegmentedButtonDefaults.itemShape(
                            index = index,
                            count = StatsChartMode.entries.size,
                        ),
                    ) {
                        Text(mode.title)
                    }
                }
            }
        }

        if (entries.isEmpty()) {
            Text(
                text = "Sin datos todavía.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(vertical = 20.dp),
            )
        } else {
            MonthlyChart(
                entries = entries,
                mode = chartMode,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(240.dp),
            )
        }
    }
}

@Composable
private fun MonthlyChart(
    entries: List<MonthlyGraphEntry>,
    mode: StatsChartMode,
    modifier: Modifier = Modifier,
) {
    val accent = LocalYomiyasuColors.current.accent
    val gridColor = MaterialTheme.colorScheme.outlineVariant
    val labelStyle = MaterialTheme.typography.labelSmall.copy(
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
    val textMeasurer = rememberTextMeasurer()

    Canvas(modifier = modifier) {
        if (entries.isEmpty()) return@Canvas

        val leftGutter = 52.dp.toPx()
        val bottomGutter = 22.dp.toPx()
        val topGutter = 10.dp.toPx()
        val chartWidth = size.width - leftGutter
        val chartHeight = size.height - topGutter - bottomGutter
        if (chartWidth <= 0f || chartHeight <= 0f) return@Canvas

        val values = entries.map { entry ->
            if (mode == StatsChartMode.Hours) entry.totalHours else entry.meanReadSpeed
        }

        val rawMax = values.maxOrNull() ?: 0.0
        val rawMin = if (mode == StatsChartMode.Hours) 0.0 else values.minOrNull() ?: 0.0
        val yMax = if (rawMax > rawMin) rawMax else rawMin + 1.0
        val yMin = if (mode == StatsChartMode.Hours) 0.0 else rawMin
        val span = (yMax - yMin).coerceAtLeast(0.0001)

        fun yFor(value: Double): Float =
            topGutter + chartHeight * (1f - ((value - yMin) / span).toFloat().coerceIn(0f, 1f))

        val gridSteps = 4
        for (step in 0..gridSteps) {
            val fraction = step.toFloat() / gridSteps
            val y = topGutter + chartHeight * (1f - fraction)

            drawLine(
                color = gridColor,
                start = Offset(leftGutter, y),
                end = Offset(size.width, y),
                strokeWidth = 1.dp.toPx(),
            )

            val value = yMin + span * fraction
            val label = when (mode) {
                StatsChartMode.Hours -> formatHours(value)
                StatsChartMode.Speed -> formatNumber(value.roundToInt())
            }
            val measured = textMeasurer.measure(AnnotatedString(label), style = labelStyle)
            drawText(
                textLayoutResult = measured,
                topLeft = Offset(
                    x = (leftGutter - measured.size.width - 6.dp.toPx()).coerceAtLeast(0f),
                    y = y - measured.size.height / 2f,
                ),
            )
        }

        val slotWidth = chartWidth / entries.size
        val labelStep = if (entries.size > 12) 2 else 1

        if (mode == StatsChartMode.Hours) {
            val barWidth = slotWidth * 0.55f
            entries.forEachIndexed { index, _ ->
                val centerX = leftGutter + slotWidth * (index + 0.5f)
                val y = yFor(values[index])
                val barHeight = (topGutter + chartHeight - y).coerceAtLeast(0f)

                if (barHeight > 0f) {
                    drawRoundRect(
                        color = accent,
                        topLeft = Offset(centerX - barWidth / 2f, y),
                        size = Size(barWidth, barHeight),
                        cornerRadius = CornerRadius(4.dp.toPx(), 4.dp.toPx()),
                    )
                }
            }
        } else {
            val path = Path()
            entries.forEachIndexed { index, _ ->
                val centerX = leftGutter + slotWidth * (index + 0.5f)
                val y = yFor(values[index])
                if (index == 0) {
                    path.moveTo(centerX, y)
                } else {
                    path.lineTo(centerX, y)
                }
            }
            drawPath(
                path = path,
                color = accent,
                style = Stroke(
                    width = 2.dp.toPx(),
                    cap = StrokeCap.Round,
                    join = StrokeJoin.Round,
                ),
            )

            entries.forEachIndexed { index, _ ->
                val centerX = leftGutter + slotWidth * (index + 0.5f)
                drawCircle(
                    color = accent,
                    radius = 3.dp.toPx(),
                    center = Offset(centerX, yFor(values[index])),
                )
            }
        }

        entries.forEachIndexed { index, entry ->
            if (index % labelStep == 0) {
                val centerX = leftGutter + slotWidth * (index + 0.5f)
                val measured = textMeasurer.measure(
                    AnnotatedString(monthLabel(entry)),
                    style = labelStyle,
                )
                drawText(
                    textLayoutResult = measured,
                    topLeft = Offset(
                        x = centerX - measured.size.width / 2f,
                        y = size.height - bottomGutter + 4.dp.toPx(),
                    ),
                )
            }
        }
    }
}

private fun speedText(stats: UserStats): String {
    if (stats.totalTimeRead <= 0) return "—"
    val charsPerHour = stats.totalCharacters / (stats.totalTimeRead / 60.0)
    return "${formatNumber(charsPerHour.roundToInt())} c/h"
}

private fun formatHours(value: Double): String =
    if (value >= 10.0) {
        value.roundToInt().toString()
    } else {
        String.format(statsLocale, "%.1f", value)
    }

private fun monthLabel(entry: MonthlyGraphEntry): String {
    val index = (entry.monthId.month - 1).coerceIn(0, 11)
    val name = Month.of(index + 1)
        .getDisplayName(TextStyle.SHORT, statsLocale)
        .removeSuffix(".")
    return "$name ${entry.monthId.year % 100}"
}

private fun statsErrorMessage(error: Throwable): String =
    (error as? ApiException)?.userMessage
        ?: error.message
        ?: "Ha ocurrido un error inesperado."
