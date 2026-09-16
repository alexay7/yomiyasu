package es.manabe.yomiyasu.features.settings

import android.content.Context
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Dns
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import es.manabe.yomiyasu.BuildConfig
import es.manabe.yomiyasu.app.ServerConfig
import es.manabe.yomiyasu.app.ui.theme.ThemeMode
import es.manabe.yomiyasu.core.models.MainView
import es.manabe.yomiyasu.core.session.SessionStore
import es.manabe.yomiyasu.core.settings.AppSettings
import es.manabe.yomiyasu.core.settings.AppSettingsData
import es.manabe.yomiyasu.core.settings.BoardFlag
import es.manabe.yomiyasu.core.settings.BookViewMode
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val settings: AppSettings,
    private val session: SessionStore,
    @ApplicationContext private val context: Context,
) : ViewModel() {

    val data: StateFlow<AppSettingsData> = settings.flow

    val serverUrl: String
        get() = ServerConfig.serverUrl?.toString() ?: ""

    /**
     * Valida y persiste la nueva URL y cierra la sesión local. Devuelve el
     * mensaje de error o `null` si el cambio se aplicó (o no había cambio).
     */
    fun changeServer(raw: String): String? {
        val trimmed = raw.trim()
        val url = ServerConfig.parse(trimmed)
            ?: return if (trimmed.isEmpty()) {
                "Introduce la URL del servidor."
            } else {
                "La dirección del servidor no es válida."
            }

        if (url != ServerConfig.serverUrl) {
            ServerConfig.setServerUrl(trimmed, context)
            session.clearLocalSession("Has cambiado de servidor. Vuelve a iniciar sesión.")
        }
        return null
    }

    fun setAppearance(value: ThemeMode) {
        viewModelScope.launch { settings.setAppearance(value) }
    }

    fun setMainView(value: MainView) {
        viewModelScope.launch { settings.setMainView(value) }
    }

    fun setAntispoilers(value: Boolean) {
        viewModelScope.launch { settings.setAntispoilers(value) }
    }

    fun setBookView(value: BookViewMode) {
        viewModelScope.launch { settings.setBookView(value) }
    }

    fun setAutoCrono(value: Boolean) {
        viewModelScope.launch { settings.setAutoCrono(value) }
    }

    fun setShowCrono(value: Boolean) {
        viewModelScope.launch { settings.setShowCrono(value) }
    }

    fun setBoard(flag: BoardFlag, value: Boolean) {
        viewModelScope.launch { settings.setBoard(flag, value) }
    }

    fun setIdleTimeout(value: Int) {
        viewModelScope.launch { settings.setIdleTimeout(value) }
    }
}

@Composable
fun SettingsRoute(
    isSocketConnected: Boolean,
    onOpenAccount: () -> Unit,
    onLogout: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val settings by viewModel.data.collectAsStateWithLifecycle()

    SettingsScreen(
        settings = settings,
        currentServerUrl = viewModel.serverUrl,
        isSocketConnected = isSocketConnected,
        onAppearanceChange = viewModel::setAppearance,
        onMainViewChange = viewModel::setMainView,
        onAntispoilersChange = viewModel::setAntispoilers,
        onBookViewChange = viewModel::setBookView,
        onAutoCronoChange = viewModel::setAutoCrono,
        onShowCronoChange = viewModel::setShowCrono,
        onBoardChange = viewModel::setBoard,
        onIdleTimeoutChange = viewModel::setIdleTimeout,
        onChangeServer = viewModel::changeServer,
        onOpenAccount = onOpenAccount,
        onLogout = onLogout,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SettingsScreen(
    settings: AppSettingsData,
    currentServerUrl: String,
    isSocketConnected: Boolean,
    onAppearanceChange: (ThemeMode) -> Unit,
    onMainViewChange: (MainView) -> Unit,
    onAntispoilersChange: (Boolean) -> Unit,
    onBookViewChange: (BookViewMode) -> Unit,
    onAutoCronoChange: (Boolean) -> Unit,
    onShowCronoChange: (Boolean) -> Unit,
    onBoardChange: (BoardFlag, Boolean) -> Unit,
    onIdleTimeoutChange: (Int) -> Unit,
    onChangeServer: (String) -> String?,
    onOpenAccount: () -> Unit,
    onLogout: () -> Unit,
) {
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showServerDialog by remember { mutableStateOf(false) }
    var serverInput by remember { mutableStateOf("") }
    var serverError by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Ajustes") }) },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .testTag("settingsList"),
            contentPadding = PaddingValues(bottom = 24.dp),
        ) {
            item { SectionHeader("Apariencia") }
            item {
                AppearanceSelector(
                    selected = settings.appearance,
                    onSelect = onAppearanceChange,
                )
            }

            item {
                SectionHeader(
                    title = "Vista principal",
                    footer = "Filtra lo que aparece en Inicio y Lista de lectura.",
                )
            }
            item {
                ChoiceChips(
                    options = MainView.entries,
                    selected = settings.mainView,
                    label = { it.title },
                    onSelect = onMainViewChange,
                )
            }

            item { SectionHeader("Biblioteca") }
            item {
                SwitchRow(
                    title = "Ocultar spoilers de volúmenes no leídos",
                    checked = settings.antispoilers,
                    onCheckedChange = onAntispoilersChange,
                )
            }
            item {
                Text(
                    text = "Info. de los libros",
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                )
            }
            item {
                ChoiceChips(
                    options = BookViewMode.entries,
                    selected = settings.bookView,
                    label = { it.title },
                    onSelect = onBookViewChange,
                )
            }

            item {
                SectionHeader(
                    title = "Tableros del inicio",
                    footer = "Elige qué secciones quieres ver en el inicio.",
                )
            }
            item {
                SwitchRow(
                    title = "En progreso",
                    checked = settings.boards.progress,
                    onCheckedChange = { onBoardChange(BoardFlag.Progress, it) },
                )
            }
            item {
                SwitchRow(
                    title = "Tu tablero",
                    checked = settings.boards.tablero,
                    onCheckedChange = { onBoardChange(BoardFlag.Tablero, it) },
                )
            }
            item {
                SwitchRow(
                    title = "Leer más tarde",
                    checked = settings.boards.readLater,
                    onCheckedChange = { onBoardChange(BoardFlag.ReadLater, it) },
                )
            }
            item {
                SwitchRow(
                    title = "Pausadas",
                    checked = settings.boards.paused,
                    onCheckedChange = { onBoardChange(BoardFlag.Paused, it) },
                )
            }
            item {
                SwitchRow(
                    title = "Libros nuevos",
                    checked = settings.boards.newBooks,
                    onCheckedChange = { onBoardChange(BoardFlag.NewBooks, it) },
                )
            }
            item {
                SwitchRow(
                    title = "Series nuevas",
                    checked = settings.boards.newSeries,
                    onCheckedChange = { onBoardChange(BoardFlag.NewSeries, it) },
                )
            }
            item {
                SwitchRow(
                    title = "Series con volúmenes nuevos",
                    checked = settings.boards.recentSeries,
                    onCheckedChange = { onBoardChange(BoardFlag.RecentSeries, it) },
                )
            }

            item { SectionHeader("Lectura") }
            item {
                SwitchRow(
                    title = "Mostrar cronómetro en el lector",
                    checked = settings.showCrono,
                    onCheckedChange = onShowCronoChange,
                )
            }
            item {
                SwitchRow(
                    title = "Iniciar cronómetro al abrir un libro",
                    checked = settings.autoCrono,
                    onCheckedChange = onAutoCronoChange,
                )
            }

            item {
                SectionHeader(
                    title = "Pausar cronómetro tras inactividad",
                    footer = "Se reanuda al cambiar de página.",
                )
            }
            item {
                ChoiceChips(
                    options = listOf(0, 1, 3, 5, 10, 15),
                    selected = settings.idleTimeout,
                    label = { minutes ->
                        when (minutes) {
                            0 -> "Nunca"
                            1 -> "1 minuto"
                            else -> "$minutes minutos"
                        }
                    },
                    onSelect = onIdleTimeoutChange,
                )
            }

            item {
                SectionHeader(
                    title = "Servidor",
                    footer = "Cambiar de servidor cerrará tu sesión y apuntará la app a la nueva dirección.",
                )
            }
            item {
                ListItem(
                    headlineContent = { Text("Dirección") },
                    supportingContent = {
                        Text(
                            text = currentServerUrl.ifEmpty { "Sin configurar" },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    },
                )
            }
            item {
                SettingsEntry(
                    title = "Cambiar servidor",
                    icon = Icons.Filled.Dns,
                    onClick = {
                        serverInput = currentServerUrl
                        serverError = null
                        showServerDialog = true
                    },
                )
            }

            item { HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp)) }
            item {
                SettingsEntry(
                    title = "Cuenta",
                    icon = Icons.Filled.AccountCircle,
                    onClick = onOpenAccount,
                )
            }
            item {
                SettingsEntry(
                    title = "Cerrar sesión",
                    icon = Icons.AutoMirrored.Filled.Logout,
                    onClick = { showLogoutDialog = true },
                    destructive = true,
                )
            }

            if (BuildConfig.DEBUG) {
                item { SectionHeader("Diagnóstico") }
                item {
                    DebugRow(
                        "Websocket",
                        if (isSocketConnected) "Conectado" else "Desconectado",
                    )
                }
            }
        }
    }

    if (showServerDialog) {
        AlertDialog(
            onDismissRequest = { showServerDialog = false },
            title = { Text("Cambiar de servidor") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = serverInput,
                        onValueChange = {
                            serverInput = it
                            serverError = null
                        },
                        label = { Text("Dirección del servidor") },
                        placeholder = { Text("https://…") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Uri,
                            imeAction = ImeAction.Done,
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("serverUrlInput"),
                    )

                    serverError?.let {
                        Text(
                            text = it,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }

                    Text(
                        text = "Se cerrará tu sesión y la app se conectará a la nueva dirección.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val error = onChangeServer(serverInput)
                        if (error == null) {
                            showServerDialog = false
                        } else {
                            serverError = error
                        }
                    },
                ) {
                    Text("Cambiar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showServerDialog = false }) { Text("Cancelar") }
            },
        )
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("¿Cerrar sesión?") },
            text = { Text("Se cerrará la sesión en este dispositivo.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutDialog = false
                        onLogout()
                    },
                ) {
                    Text("Cerrar sesión", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) { Text("Cancelar") }
            },
        )
    }
}

@Composable
private fun SectionHeader(title: String, footer: String? = null) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 4.dp),
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.primary,
        )
        footer?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AppearanceSelector(
    selected: ThemeMode,
    onSelect: (ThemeMode) -> Unit,
) {
    SingleChoiceSegmentedButtonRow(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
    ) {
        ThemeMode.entries.forEachIndexed { index, mode ->
            SegmentedButton(
                selected = mode == selected,
                onClick = { onSelect(mode) },
                shape = SegmentedButtonDefaults.itemShape(
                    index = index,
                    count = ThemeMode.entries.size,
                ),
                label = { Text(mode.title) },
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
private fun <T> ChoiceChips(
    options: List<T>,
    selected: T,
    label: (T) -> String,
    onSelect: (T) -> Unit,
) {
    FlowRow(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        options.forEach { option ->
            FilterChip(
                selected = option == selected,
                onClick = { onSelect(option) },
                label = { Text(label(option)) },
            )
        }
    }
}

@Composable
private fun SwitchRow(
    title: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .toggleable(
                value = checked,
                role = Role.Switch,
                onValueChange = onCheckedChange,
            )
            .padding(horizontal = 16.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.weight(1f),
        )
        Switch(checked = checked, onCheckedChange = null)
    }
}

@Composable
private fun SettingsEntry(
    title: String,
    icon: ImageVector,
    onClick: () -> Unit,
    destructive: Boolean = false,
) {
    val contentColor = if (destructive) {
        MaterialTheme.colorScheme.error
    } else {
        MaterialTheme.colorScheme.onSurface
    }

    ListItem(
        headlineContent = { Text(title, color = contentColor) },
        leadingContent = { Icon(imageVector = icon, contentDescription = null, tint = contentColor) },
        modifier = Modifier.clickable(onClick = onClick),
    )
}

@Composable
private fun DebugRow(label: String, value: String) {
    ListItem(
        headlineContent = { Text(label) },
        supportingContent = {
            Text(
                text = value,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        },
    )
}

private val ThemeMode.title: String
    get() = when (this) {
        ThemeMode.System -> "Sistema"
        ThemeMode.Light -> "Claro"
        ThemeMode.Dark -> "Oscuro"
    }
