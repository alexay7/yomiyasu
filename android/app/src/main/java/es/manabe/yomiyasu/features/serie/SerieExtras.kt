package es.manabe.yomiyasu.features.serie

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material.icons.filled.StarHalf
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import es.manabe.yomiyasu.components.DifficultyFlame
import es.manabe.yomiyasu.components.StarRating
import es.manabe.yomiyasu.core.models.CreateReviewRequest
import es.manabe.yomiyasu.core.models.ProgressRecord
import es.manabe.yomiyasu.core.models.Review
import es.manabe.yomiyasu.core.models.ReviewLevel
import es.manabe.yomiyasu.core.networking.ApiException
import es.manabe.yomiyasu.core.services.LibraryApi
import es.manabe.yomiyasu.core.services.ProgressApi
import es.manabe.yomiyasu.core.session.SessionStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SerieSpeedViewModel @Inject constructor(
    private val progress: ProgressApi,
) : ViewModel() {

    private val _entries = MutableStateFlow<List<ProgressRecord>>(emptyList())
    val entries: StateFlow<List<ProgressRecord>> = _entries.asStateFlow()

    fun load(serieId: String) {
        viewModelScope.launch {
            _entries.value = runCatching { progress.speed(serieId) }.getOrDefault(emptyList())
        }
    }
}

@Composable
fun SerieSpeedSection(
    serieId: String,
    viewModel: SerieSpeedViewModel = hiltViewModel(),
) {
    val entries by viewModel.entries.collectAsStateWithLifecycle()

    LaunchedEffect(serieId) { viewModel.load(serieId) }

    if (entries.isEmpty()) return

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Velocidad de lectura", style = MaterialTheme.typography.titleMedium)

        val data = entries.mapNotNull { entry ->
            val speed = entry.meanReadSpeed ?: return@mapNotNull null
            es.manabe.yomiyasu.core.networking.IsoDate.parse(entry.endDate ?: entry.startDate)
                ?.toEpochMilli() to speed
        }.sortedBy { it.first }

        if (data.isNotEmpty()) {
            SpeedChart(
                points = data.map { it.second.toFloat() },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .testTag("serieSpeedChart"),
            )

            val min = data.minOf { it.second }
            val max = data.maxOf { it.second }
            Text(
                text = "Mín. ${min.toInt()} · Máx. ${max.toInt()} car./h",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun SpeedChart(points: List<Float>, modifier: Modifier = Modifier) {
    val accent = MaterialTheme.colorScheme.primary

    androidx.compose.foundation.Canvas(modifier = modifier) {
        if (points.size < 2) return@Canvas

        val minValue = points.min()
        val maxValue = points.max()
        val range = (maxValue - minValue).takeIf { it > 0f } ?: 1f
        val stepX = size.width / (points.size - 1)

        val path = androidx.compose.ui.graphics.Path()
        points.forEachIndexed { index, value ->
            val x = index * stepX
            val y = size.height - ((value - minValue) / range) * (size.height * 0.9f) - size.height * 0.05f

            if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
        }

        drawPath(
            path = path,
            color = accent,
            style = androidx.compose.ui.graphics.drawscope.Stroke(
                width = 4f,
                cap = StrokeCap.Round,
            ),
        )

        points.forEachIndexed { index, value ->
            val x = index * stepX
            val y = size.height - ((value - minValue) / range) * (size.height * 0.9f) - size.height * 0.05f
            drawCircle(color = accent, radius = 6f, center = Offset(x, y))
        }
    }
}

@HiltViewModel
class SerieReviewsViewModel @Inject constructor(
    private val library: LibraryApi,
    session: SessionStore,
) : ViewModel() {

    val currentUserId: String? = (session.state.value as? SessionStore.State.LoggedIn)?.user?.id

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    fun deleteReview(id: String, onDone: () -> Unit) {
        viewModelScope.launch {
            try {
                library.deleteReview(id)
                onDone()
            } catch (error: ApiException) {
                _error.value = error.userMessage
            }
        }
    }
}

@Composable
fun SerieReviewsSection(
    serieId: String,
    reviews: List<Review>,
    onWriteReview: () -> Unit,
    onReviewsChanged: () -> Unit,
    viewModel: SerieReviewsViewModel = hiltViewModel(),
) {
    val error by viewModel.error.collectAsStateWithLifecycle()
    var pendingDelete by remember { mutableStateOf<Review?>(null) }
    var pendingEdit by remember { mutableStateOf<Review?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Reseñas", style = MaterialTheme.typography.titleMedium)
            TextButton(onClick = onWriteReview) { Text("Escribir reseña") }
        }

        if (reviews.isEmpty()) {
            Text(
                text = "Todavía no hay reseñas.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            reviews.forEach { review ->
                ReviewCard(
                    review = review,
                    isOwn = review.user == viewModel.currentUserId,
                    onEdit = { pendingEdit = review },
                    onDelete = { pendingDelete = review },
                )
            }
        }

        error?.let {
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
    }

    pendingEdit?.let { review ->
        ReviewFormDialog(
            serieId = serieId,
            existing = review,
            onDismiss = { pendingEdit = null },
            onSubmitted = { onReviewsChanged() },
        )
    }

    pendingDelete?.let { review ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text("¿Borrar tu reseña?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        pendingDelete = null
                        viewModel.deleteReview(review.id) { onReviewsChanged() }
                    },
                ) { Text("Borrar") }
            },
            dismissButton = {
                TextButton(onClick = { pendingDelete = null }) { Text("Cancelar") }
            },
        )
    }
}

@Composable
private fun ReviewCard(
    review: Review,
    isOwn: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(MaterialTheme.colorScheme.surfaceContainerHigh)
            .padding(10.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = review.name ?: "Usuario",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
            )

            review.userLevel?.let { level ->
                Text(
                    text = level,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(MaterialTheme.colorScheme.surfaceContainerHighest)
                        .padding(horizontal = 6.dp, vertical = 2.dp),
                )
            }

            androidx.compose.foundation.layout.Spacer(modifier = Modifier.weight(1f))

            review.difficulty?.let { difficulty ->
                DifficultyFlame(difficulty = difficulty.toDouble() * 2, size = 14)
            }

            review.valoration?.let { valoration ->
                if (valoration > 0) StarRating(valoration = valoration.toDouble(), starSize = 12)
            }

            if (isOwn) {
                IconButton(onClick = onEdit, modifier = Modifier.size(24.dp)) {
                    Icon(
                        Icons.Filled.Edit,
                        contentDescription = "Editar reseña",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(16.dp),
                    )
                }

                IconButton(onClick = onDelete, modifier = Modifier.size(24.dp)) {
                    Icon(
                        Icons.Filled.Delete,
                        contentDescription = "Borrar reseña",
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
        }

        review.comment?.takeIf { it.isNotEmpty() }?.let { comment ->
            Text(text = comment, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReviewFormDialog(
    serieId: String,
    existing: Review? = null,
    onDismiss: () -> Unit,
    onSubmitted: () -> Unit,
    viewModel: ReviewFormViewModel = hiltViewModel(),
) {
    var level by remember(existing) {
        mutableStateOf(
            existing?.userLevel
                ?.let { stored -> ReviewLevel.entries.find { it.rawValue == stored } }
                ?: ReviewLevel.N3
        )
    }
    var difficulty by remember(existing) { mutableFloatStateOf((existing?.difficulty ?: 3).toFloat()) }
    var valoration by remember(existing) { mutableIntStateOf(existing?.valoration ?: 0) }
    var comment by remember(existing) { mutableStateOf(existing?.comment ?: "") }
    val isSaving by viewModel.isSaving.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (existing == null) "Escribir reseña" else "Editar reseña") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Tu nivel de japonés", style = MaterialTheme.typography.titleSmall)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    ReviewLevel.entries.take(4).forEach { option ->
                        FilterChip(
                            selected = level == option,
                            onClick = { level = option },
                            label = { Text(option.rawValue, style = MaterialTheme.typography.labelSmall) },
                        )
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    ReviewLevel.entries.drop(4).forEach { option ->
                        FilterChip(
                            selected = level == option,
                            onClick = { level = option },
                            label = { Text(option.rawValue, style = MaterialTheme.typography.labelSmall) },
                        )
                    }
                }

                Text("Dificultad: ${difficulty.toInt()}", style = MaterialTheme.typography.titleSmall)
                Slider(
                    value = difficulty,
                    onValueChange = { difficulty = it },
                    valueRange = 1f..5f,
                    steps = 3,
                )

                Text("Valoración", style = MaterialTheme.typography.titleSmall)
                StarRatingInput(valoration = valoration, onValorationChange = { valoration = it })

                OutlinedTextField(
                    value = comment,
                    onValueChange = { if (it.length <= 500) comment = it },
                    label = { Text("Comentario") },
                    supportingText = { Text("${comment.length}/500") },
                    minLines = 3,
                    modifier = Modifier.fillMaxWidth(),
                )

                error?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    viewModel.submit(
                        CreateReviewRequest(
                            serie = serieId,
                            userLevel = level.rawValue,
                            difficulty = difficulty.toInt(),
                            valoration = valoration,
                            comment = comment,
                        ),
                        reviewId = existing?.id,
                        onSubmitted = {
                            onSubmitted()
                            onDismiss()
                        },
                    )
                },
                enabled = !isSaving,
            ) {
                if (isSaving) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp))
                } else {
                    Text(if (existing == null) "Publicar" else "Guardar")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        },
    )
}

@HiltViewModel
class ReviewFormViewModel @Inject constructor(
    private val library: LibraryApi,
) : ViewModel() {

    private val _isSaving = MutableStateFlow(false)
    val isSaving: StateFlow<Boolean> = _isSaving.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    fun submit(request: CreateReviewRequest, reviewId: String? = null, onSubmitted: () -> Unit) {
        viewModelScope.launch {
            _isSaving.value = true
            _error.value = null
            try {
                if (reviewId == null) {
                    library.createReview(request)
                } else {
                    library.editReview(reviewId, request)
                }
                onSubmitted()
            } catch (error: ApiException) {
                _error.value = error.userMessage
            } finally {
                _isSaving.value = false
            }
        }
    }
}

@Composable
fun StarRatingInput(
    valoration: Int,
    onValorationChange: (Int) -> Unit,
) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
        for (index in 0 until 5) {
            val icon = when {
                valoration >= (index + 1) * 2 -> Icons.Filled.Star
                valoration == index * 2 + 1 -> Icons.Filled.StarHalf
                else -> Icons.Filled.StarBorder
            }

            Row {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = Color(0xFFFFC107),
                    modifier = Modifier
                        .size(28.dp)
                        .clickable { onValorationChange(index * 2 + 1) },
                )
            }
        }

        Text(
            text = "$valoration/10",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(start = 6.dp),
        )

        if (valoration > 0) {
            TextButton(onClick = { onValorationChange(0) }) {
                Text("Quitar", style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}
