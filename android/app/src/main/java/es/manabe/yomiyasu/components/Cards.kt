package es.manabe.yomiyasu.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
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
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkRemove
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.DownloadDone
import androidx.compose.material.icons.filled.PauseCircle
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Undo
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import es.manabe.yomiyasu.app.ui.theme.LocalYomiyasuColors
import es.manabe.yomiyasu.core.models.Book
import es.manabe.yomiyasu.core.models.ProgressStatus
import es.manabe.yomiyasu.core.settings.AppSettingsData
import es.manabe.yomiyasu.core.settings.BookViewMode

class BookCardActions(
    val onOpen: () -> Unit = {},
    val onGoToSerie: (() -> Unit)? = null,
    val onMarkCompleted: (currentPage: Int?, characters: Int?) -> Unit = { _, _ -> },
    val onMarkUnread: () -> Unit = {},
    val onToggleReadlist: (() -> Unit)? = null,
    val onDownload: (() -> Unit)? = null,
)

class SerieCardActions(
    val onOpen: () -> Unit = {},
    val onContinueReading: (() -> Unit)? = null,
    val onMarkRead: () -> Unit = {},
    val onTogglePaused: () -> Unit = {},
    val onToggleReadlist: () -> Unit = {},
)

fun bookInfoText(book: Book, settings: AppSettingsData): String? {
    val characters = book.characters ?: 0
    val pages = book.pages ?: 0
    val readCharacters = book.lastProgress?.characters ?: 0
    val currentPage = book.lastProgress?.currentPage ?: 1

    return when (settings.bookView) {
        BookViewMode.Characters ->
            if (characters > 0) "${formatNumber(characters)} car." else null

        BookViewMode.Pages ->
            if (pages > 0) "$pages pág." else null

        BookViewMode.Both -> {
            val parts = buildList {
                if (characters > 0) add("${formatNumber(characters)} car.")
                if (pages > 0) add("$pages pág.")
            }
            if (parts.isEmpty()) null else parts.joinToString(" · ")
        }

        BookViewMode.RemainingCharacters -> {
            val remaining = maxOf(characters - readCharacters, 0)
            if (characters > 0) "Quedan ${formatNumber(remaining)} car." else null
        }

        BookViewMode.RemainingPages -> {
            val remaining = maxOf(pages - currentPage, 0)
            if (pages > 0) "Quedan $remaining pág." else null
        }

        BookViewMode.RemainingTime -> {
            val speed = settings.meanCharactersPerHour
            if (characters <= 0 || speed == null || speed <= 0) {
                null
            } else {
                val remaining = maxOf(characters - readCharacters, 0)
                val seconds = (remaining / speed * 3600).toInt()
                if (seconds > 0) "~${durationText(seconds)}" else null
            }
        }
    }
}

@Composable
fun BookCard(
    book: Book,
    coverUrl: String?,
    settings: AppSettingsData,
    actions: BookCardActions,
    modifier: Modifier = Modifier,
    width: Dp = 110.dp,
    blurred: Boolean = false,
    isDownloaded: Boolean = false,
) {
    var menuOpen by remember { mutableStateOf(false) }
    var markReadDialog by remember { mutableStateOf(false) }
    val accent = LocalYomiyasuColors.current

    Column(
        modifier = modifier
            .width(width)
            .testTag("bookCard-${book.id}"),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Box {
            Box {
                RemoteImage(
                    url = coverUrl,
                    contentDescription = book.visibleName,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(width * 1.45f)
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.surfaceContainerHighest),
                    blurred = blurred,
                )

                if (book.resolvedStatus == ProgressStatus.Unread) {
                    UnreadTriangle(modifier = Modifier.align(Alignment.TopStart))
                }

                if (book.isMokured) {
                    Icon(
                        imageVector = Icons.Filled.Warning,
                        contentDescription = "Libro mokureado",
                        tint = Color(0xFFFFEB3B),
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(4.dp)
                            .size(14.dp),
                    )
                }

                if (isDownloaded) {
                    Icon(
                        imageVector = Icons.Filled.DownloadDone,
                        contentDescription = "Descargado",
                        tint = accent.accent,
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(4.dp)
                            .size(16.dp),
                    )
                }
            }

            Box(
                modifier = Modifier
                    .matchParentSize()
                    .combinedClickable(
                        onClick = actions.onOpen,
                        onLongClick = { menuOpen = true },
                    ),
            )

            DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                actions.onGoToSerie?.let { goToSerie ->
                    DropdownMenuItem(
                        text = { Text("Ir a la serie") },
                        onClick = {
                            menuOpen = false
                            goToSerie()
                        },
                    )
                }

                if (book.resolvedStatus != ProgressStatus.Completed) {
                    DropdownMenuItem(
                        text = { Text("Marcar como leído") },
                        onClick = {
                            menuOpen = false
                            val currentPage = book.lastProgress?.currentPage ?: 0
                            if (book.resolvedStatus == ProgressStatus.Reading && currentPage > 0) {
                                markReadDialog = true
                            } else {
                                actions.onMarkCompleted(null, null)
                            }
                        },
                    )
                }

                if (book.resolvedStatus == ProgressStatus.Completed) {
                    DropdownMenuItem(
                        text = { Text("Marcar como no leído") },
                        onClick = {
                            menuOpen = false
                            actions.onMarkUnread()
                        },
                    )
                } else if (book.resolvedStatus == ProgressStatus.Reading) {
                    DropdownMenuItem(
                        text = { Text("Eliminar progreso actual") },
                        onClick = {
                            menuOpen = false
                            actions.onMarkUnread()
                        },
                    )
                }

                actions.onToggleReadlist?.let { toggleReadlist ->
                    DropdownMenuItem(
                        text = {
                            Text(
                                if (book.readlist?.isInReadlist == true) {
                                    "Quitar serie de Leer más tarde"
                                } else {
                                    "Añadir serie a Leer más tarde"
                                },
                            )
                        },
                        onClick = {
                            menuOpen = false
                            toggleReadlist()
                        },
                    )
                }

                if (!isDownloaded) {
                    actions.onDownload?.let { download ->
                        DropdownMenuItem(
                            text = { Text("Descargar") },
                            onClick = {
                                menuOpen = false
                                download()
                            },
                        )
                    }
                }
            }
        }

        if (book.resolvedStatus != ProgressStatus.Unread) {
            LinearProgressIndicator(
                progress = { book.progressFraction.toFloat() },
                modifier = Modifier
                    .width(width)
                    .height(3.dp),
            )
        }

        Text(
            text = book.visibleName,
            style = MaterialTheme.typography.labelSmall,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.fillMaxWidth(),
        )

        bookInfoText(book, settings)?.let { info ->
            Text(
                text = info,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }

    if (markReadDialog) {
        val currentPage = book.lastProgress?.currentPage ?: 0
        AlertDialog(
            onDismissRequest = { markReadDialog = false },
            title = { Text("¿Hasta qué página marcar como leído?") },
            text = {
                Column {
                    TextButton(
                        onClick = {
                            markReadDialog = false
                            actions.onMarkCompleted(currentPage, book.lastProgress?.characters)
                        },
                    ) { Text("Página $currentPage") }

                    val pages = book.pages ?: 0
                    if (pages > 0) {
                        TextButton(
                            onClick = {
                                markReadDialog = false
                                actions.onMarkCompleted(pages, book.characters)
                            },
                        ) { Text("Última página ($pages)") }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { markReadDialog = false }) { Text("Cancelar") }
            },
        )
    }
}

@Composable
fun SerieCard(
    serie: es.manabe.yomiyasu.core.models.Serie,
    coverUrl: String?,
    actions: SerieCardActions,
    modifier: Modifier = Modifier,
    width: Dp = 120.dp,
) {
    var menuOpen by remember { mutableStateOf(false) }
    val accent = LocalYomiyasuColors.current

    Column(
        modifier = modifier
            .width(width)
            .testTag("serieCard-${serie.id}"),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box {
            Box {
                RemoteImage(
                    url = coverUrl,
                    contentDescription = serie.visibleName,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(width * 1.45f)
                        .clip(RoundedCornerShape(10.dp))
                        .background(MaterialTheme.colorScheme.surfaceContainerHighest),
                )

                if (serie.unreadCount > 0) {
                    Surface(
                        color = if (serie.isInReadlist) accent.accent else MaterialTheme.colorScheme.primary,
                        shape = RoundedCornerShape(50),
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(5.dp),
                    ) {
                        Text(
                            text = "${serie.unreadCount}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                        )
                    }
                }
            }

            Box(
                modifier = Modifier
                    .matchParentSize()
                    .combinedClickable(
                        onClick = actions.onOpen,
                        onLongClick = { menuOpen = true },
                    ),
            )

            DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                actions.onContinueReading?.let { continueReading ->
                    DropdownMenuItem(
                        text = {
                            Text(
                                if (serie.unreadCount == 0) "Leer de nuevo" else "Leer siguiente volumen",
                            )
                        },
                        onClick = {
                            menuOpen = false
                            continueReading()
                        },
                    )
                }

                if (serie.unreadCount > 0) {
                    DropdownMenuItem(
                        text = { Text("Marcar serie como leída") },
                        onClick = {
                            menuOpen = false
                            actions.onMarkRead()
                        },
                    )
                }

                DropdownMenuItem(
                    text = { Text(if (serie.isPaused) "Reanudar serie" else "Pausar serie") },
                    onClick = {
                        menuOpen = false
                        actions.onTogglePaused()
                    },
                )

                DropdownMenuItem(
                    text = {
                        Text(
                            if (serie.isInReadlist) "Quitar de Leer más tarde" else "Añadir a Leer más tarde",
                        )
                    },
                    onClick = {
                        menuOpen = false
                        actions.onToggleReadlist()
                    },
                )
            }
        }

        Text(
            text = serie.visibleName,
            style = MaterialTheme.typography.bodySmall,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.fillMaxWidth(),
        )

        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
            DifficultyFlame(difficulty = serie.difficulty)
            StarRating(valoration = serie.valoration)

            if (serie.isPaused) {
                Icon(
                    imageVector = Icons.Filled.PauseCircle,
                    contentDescription = "Pausada",
                    tint = Color(0xFFFF9800),
                    modifier = Modifier.size(14.dp),
                )
            }
        }
    }
}

@Composable
fun UnreadTriangle(modifier: Modifier = Modifier) {
    val accent = LocalYomiyasuColors.current

    Canvas(modifier = modifier.size(22.dp)) {
        val path = Path().apply {
            moveTo(0f, 0f)
            lineTo(size.width, 0f)
            lineTo(0f, size.height)
            close()
        }
        drawPath(path, accent.accent)
    }
}
