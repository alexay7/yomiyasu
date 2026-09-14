package es.manabe.yomiyasu.features.history

import androidx.activity.compose.LocalOnBackPressedDispatcherOwner
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import es.manabe.yomiyasu.app.ui.theme.LocalYomiyasuColors
import es.manabe.yomiyasu.components.EmptyBox
import es.manabe.yomiyasu.components.ErrorBox
import es.manabe.yomiyasu.components.LogRow
import es.manabe.yomiyasu.core.models.ProgressRecord
import es.manabe.yomiyasu.core.networking.ApiException
import es.manabe.yomiyasu.core.services.ProgressApi
import es.manabe.yomiyasu.core.services.SocketService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale
import javax.inject.Inject

private val calendarLocale: Locale = Locale("es", "ES")
private val monthTitleFormatter: DateTimeFormatter =
    DateTimeFormatter.ofPattern("MMMM yyyy", calendarLocale)

private val weekdaySymbols = listOf("L", "M", "X", "J", "V", "S", "D")

@HiltViewModel
class CalendarViewModel @Inject constructor(
    private val progress: ProgressApi,
    socket: SocketService,
) : ViewModel() {

    data class UiState(
        val year: Int,
        val month: Int,
        val days: Map<Int, Int> = emptyMap(),
        val selectedDay: Int? = null,
        val logs: List<ProgressRecord> = emptyList(),
        val isLoading: Boolean = true,
        val isLoadingLogs: Boolean = false,
        val error: String? = null,
    ) {
        val maxCount: Int
            get() = days.values.maxOrNull()?.coerceAtLeast(1) ?: 1
    }

    private val initialMonth: YearMonth = YearMonth.now()

    private val _state = MutableStateFlow(
        UiState(year = initialMonth.year, month = initialMonth.monthValue),
    )
    val state: StateFlow<UiState> = _state.asStateFlow()

    val libraryUpdatedAt: StateFlow<Long?> = socket.libraryUpdatedAt

    init {
        loadStreak(clearSelection = true)
    }

    fun showPreviousMonth() = shiftMonth(-1)

    fun showNextMonth() = shiftMonth(1)

    fun refresh() = loadStreak(clearSelection = true)

    fun selectDay(day: Int) {
        val year = _state.value.year
        val month = _state.value.month

        _state.update {
            it.copy(
                selectedDay = day,
                logs = emptyList(),
                isLoadingLogs = true,
                error = null,
            )
        }

        viewModelScope.launch {
            try {
                val logs = progress.logs(year, month, day)
                _state.update { current ->
                    if (current.year == year && current.month == month && current.selectedDay == day) {
                        current.copy(logs = logs, isLoadingLogs = false)
                    } else {
                        current
                    }
                }
            } catch (error: Exception) {
                _state.update { current ->
                    if (current.year == year && current.month == month && current.selectedDay == day) {
                        current.copy(isLoadingLogs = false, error = calendarErrorMessage(error))
                    } else {
                        current
                    }
                }
            }
        }
    }

    private fun shiftMonth(delta: Int) {
        val shifted = YearMonth.of(_state.value.year, _state.value.month).plusMonths(delta.toLong())
        _state.update {
            it.copy(
                year = shifted.year,
                month = shifted.monthValue,
                selectedDay = null,
                logs = emptyList(),
            )
        }
        loadStreak(clearSelection = false)
    }

    private fun loadStreak(clearSelection: Boolean) {
        val year = _state.value.year
        val month = _state.value.month

        _state.update {
            it.copy(
                isLoading = true,
                error = null,
                selectedDay = if (clearSelection) null else it.selectedDay,
                logs = if (clearSelection) emptyList() else it.logs,
            )
        }

        viewModelScope.launch {
            try {
                val days = progress.streak(year, month)
                _state.update { current ->
                    if (current.year == year && current.month == month) {
                        current.copy(
                            days = days.associate { it.dayOfMonth to it.count },
                            isLoading = false,
                        )
                    } else {
                        current
                    }
                }
            } catch (error: Exception) {
                _state.update { current ->
                    if (current.year == year && current.month == month) {
                        current.copy(isLoading = false, error = calendarErrorMessage(error))
                    } else {
                        current
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalendarRoute(
    viewModel: CalendarViewModel = hiltViewModel(),
    onBack: (() -> Unit)? = null,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val libraryUpdatedAt by viewModel.libraryUpdatedAt.collectAsStateWithLifecycle()

    val backDispatcher = LocalOnBackPressedDispatcherOwner.current?.onBackPressedDispatcher
    val backAction: (() -> Unit)? = onBack ?: backDispatcher?.let { dispatcher ->
        { dispatcher.onBackPressed() }
    }

    val error = state.error

    LaunchedEffect(libraryUpdatedAt) {
        if (libraryUpdatedAt != null) viewModel.refresh()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Calendario") },
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            MonthHeader(
                year = state.year,
                month = state.month,
                onPrevious = viewModel::showPreviousMonth,
                onNext = viewModel::showNextMonth,
            )

            Heatmap(
                year = state.year,
                month = state.month,
                days = state.days,
                maxCount = state.maxCount,
                selectedDay = state.selectedDay,
                onSelectDay = viewModel::selectDay,
            )

            when {
                state.isLoading -> Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 20.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }

                error != null -> ErrorBox(
                    message = error,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp),
                    onRetry = viewModel::refresh,
                )

                state.selectedDay != null -> DayLogs(
                    day = state.selectedDay ?: 0,
                    logs = state.logs,
                    isLoading = state.isLoadingLogs,
                )

                else -> Text(
                    text = "Toca un día para ver sus lecturas.",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 10.dp),
                )
            }
        }
    }
}

@Composable
private fun MonthHeader(
    year: Int,
    month: Int,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = onPrevious) {
            Icon(
                imageVector = Icons.Filled.ChevronLeft,
                contentDescription = "Mes anterior",
            )
        }

        Text(
            text = monthTitle(year, month),
            style = MaterialTheme.typography.titleMedium,
            textAlign = TextAlign.Center,
            modifier = Modifier.weight(1f),
        )

        IconButton(onClick = onNext) {
            Icon(
                imageVector = Icons.Filled.ChevronRight,
                contentDescription = "Mes siguiente",
            )
        }
    }
}

@Composable
private fun Heatmap(
    year: Int,
    month: Int,
    days: Map<Int, Int>,
    maxCount: Int,
    selectedDay: Int?,
    onSelectDay: (Int) -> Unit,
) {
    val accent = LocalYomiyasuColors.current.accent
    val emptyColor = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.12f)
    val firstOffset = LocalDate.of(year, month, 1).dayOfWeek.value - 1
    val daysInMonth = YearMonth.of(year, month).lengthOfMonth()

    val cells: List<Int?> = List(firstOffset) { null } + (1..daysInMonth).toList()
    val weeks = cells.chunked(7).map { week ->
        week + List((7 - week.size).coerceAtLeast(0)) { null }
    }

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            weekdaySymbols.forEach { symbol ->
                Text(
                    text = symbol,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f),
                )
            }
        }

        weeks.forEach { week ->
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                week.forEach { day ->
                    if (day == null) {
                        Spacer(
                            modifier = Modifier
                                .weight(1f)
                                .height(38.dp),
                        )
                    } else {
                        val count = days[day] ?: 0
                        val ratio = (count.toDouble() / maxCount.toDouble()).coerceAtMost(1.0)
                        val background = if (count > 0) {
                            accent.copy(alpha = (0.25 + 0.65 * ratio).toFloat())
                        } else {
                            emptyColor
                        }

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(38.dp)
                                .clip(RoundedCornerShape(6.dp))
                                .background(background)
                                .then(
                                    if (selectedDay == day) {
                                        Modifier.border(
                                            width = 2.dp,
                                            color = accent,
                                            shape = RoundedCornerShape(6.dp),
                                        )
                                    } else {
                                        Modifier
                                    },
                                )
                                .clickable { onSelectDay(day) },
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = day.toString(),
                                style = MaterialTheme.typography.labelSmall,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DayLogs(
    day: Int,
    logs: List<ProgressRecord>,
    isLoading: Boolean,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("calendarLogs"),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            text = "Día $day",
            style = MaterialTheme.typography.titleMedium,
        )

        when {
            isLoading -> Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(80.dp),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }

            logs.isEmpty() -> EmptyBox(
                text = "Sin lecturas ese día.",
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp),
            )

            else -> Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                logs.forEachIndexed { index, record ->
                    LogRow(record = record)
                    if (index != logs.lastIndex) {
                        HorizontalDivider()
                    }
                }
            }
        }
    }
}

private fun monthTitle(year: Int, month: Int): String {
    val formatted = YearMonth.of(year, month).atDay(1).format(monthTitleFormatter)
    return formatted.replaceFirstChar { it.titlecase(calendarLocale) }
}

private fun calendarErrorMessage(error: Throwable): String =
    (error as? ApiException)?.userMessage
        ?: error.message
        ?: "Ha ocurrido un error inesperado."
