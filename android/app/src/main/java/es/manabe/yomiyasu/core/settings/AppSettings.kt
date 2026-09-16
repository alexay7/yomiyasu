package es.manabe.yomiyasu.core.settings

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.doublePreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import es.manabe.yomiyasu.app.ui.theme.ThemeMode
import es.manabe.yomiyasu.core.di.ApplicationScope
import es.manabe.yomiyasu.core.models.MainView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject
import javax.inject.Singleton

enum class BookViewMode(val rawValue: String) {
    Characters("characters"),
    Pages("pages"),
    Both("both"),
    RemainingCharacters("remainingCharacters"),
    RemainingPages("remainingPages"),
    RemainingTime("remainingTime"),
    ;

    val title: String
        get() = when (this) {
            Characters -> "Caracteres"
            Pages -> "Páginas"
            Both -> "Ambos"
            RemainingCharacters -> "Caracteres restantes"
            RemainingPages -> "Páginas restantes"
            RemainingTime -> "Tiempo restante"
        }
}

data class BoardVisibility(
    val progress: Boolean = true,
    val tablero: Boolean = true,
    val readLater: Boolean = true,
    val paused: Boolean = false,
    val newBooks: Boolean = true,
    val newSeries: Boolean = true,
    val recentSeries: Boolean = true,
)

enum class BoardFlag {
    Progress,
    Tablero,
    ReadLater,
    Paused,
    NewBooks,
    NewSeries,
    RecentSeries,
}

data class AppSettingsData(
    val mainView: MainView = MainView.Both,
    val antispoilers: Boolean = false,
    val appearance: ThemeMode = ThemeMode.Dark,
    val autoCrono: Boolean = false,
    val showCrono: Boolean = true,
    val bookView: BookViewMode = BookViewMode.Characters,
    val meanCharactersPerHour: Double? = null,
    val idleTimeout: Int = 0,
    val boards: BoardVisibility = BoardVisibility(),
)

@Singleton
class AppSettings @Inject constructor(
    private val dataStore: DataStore<Preferences>,
    @ApplicationScope private val scope: CoroutineScope,
) {
    private object Key {
        val MainView = stringPreferencesKey("mainView")
        val Antispoilers = booleanPreferencesKey("antispoilers")
        val Appearance = stringPreferencesKey("appearance")
        val AutoCrono = booleanPreferencesKey("autoCrono")
        val ShowCrono = booleanPreferencesKey("showCrono")
        val BookView = stringPreferencesKey("bookView")
        val MeanSpeed = doublePreferencesKey("meanSpeed")
        val IdleTimeout = intPreferencesKey("idleTimeout")
        val BoardProgress = booleanPreferencesKey("boardProgress")
        val BoardTablero = booleanPreferencesKey("boardTablero")
        val BoardReadLater = booleanPreferencesKey("boardReadLater")
        val BoardPaused = booleanPreferencesKey("boardPaused")
        val BoardNewBooks = booleanPreferencesKey("boardNewBooks")
        val BoardNewSeries = booleanPreferencesKey("boardNewSeries")
        val BoardRecentSeries = booleanPreferencesKey("boardRecentSeries")
    }

    private fun boardKey(flag: BoardFlag): Preferences.Key<Boolean> = when (flag) {
        BoardFlag.Progress -> Key.BoardProgress
        BoardFlag.Tablero -> Key.BoardTablero
        BoardFlag.ReadLater -> Key.BoardReadLater
        BoardFlag.Paused -> Key.BoardPaused
        BoardFlag.NewBooks -> Key.BoardNewBooks
        BoardFlag.NewSeries -> Key.BoardNewSeries
        BoardFlag.RecentSeries -> Key.BoardRecentSeries
    }

    private fun boardsOf(prefs: Preferences): BoardVisibility = BoardVisibility(
        progress = prefs[Key.BoardProgress] ?: true,
        tablero = prefs[Key.BoardTablero] ?: true,
        readLater = prefs[Key.BoardReadLater] ?: true,
        paused = prefs[Key.BoardPaused] ?: false,
        newBooks = prefs[Key.BoardNewBooks] ?: true,
        newSeries = prefs[Key.BoardNewSeries] ?: true,
        recentSeries = prefs[Key.BoardRecentSeries] ?: true,
    )

    val flow: StateFlow<AppSettingsData> = dataStore.data
        .map { prefs ->
            AppSettingsData(
                mainView = prefs[Key.MainView]
                    ?.let { value -> MainView.entries.firstOrNull { it.rawValue == value } }
                    ?: MainView.Both,
                antispoilers = prefs[Key.Antispoilers] ?: false,
                appearance = prefs[Key.Appearance]
                    ?.let { value -> ThemeMode.entries.firstOrNull { it.name.lowercase() == value } }
                    ?: ThemeMode.Dark,
                autoCrono = prefs[Key.AutoCrono] ?: false,
                showCrono = prefs[Key.ShowCrono] ?: true,
                bookView = prefs[Key.BookView]
                    ?.let { value -> BookViewMode.entries.firstOrNull { it.rawValue == value } }
                    ?: BookViewMode.Characters,
                meanCharactersPerHour = prefs[Key.MeanSpeed],
                idleTimeout = prefs[Key.IdleTimeout] ?: 0,
                boards = boardsOf(prefs),
            )
        }
        .stateIn(scope, SharingStarted.Eagerly, AppSettingsData())

    suspend fun current(): AppSettingsData = flow.first()

    suspend fun setMainView(value: MainView) {
        dataStore.edit { it[Key.MainView] = value.rawValue }
    }

    suspend fun setAntispoilers(value: Boolean) {
        dataStore.edit { it[Key.Antispoilers] = value }
    }

    suspend fun setAppearance(value: ThemeMode) {
        dataStore.edit { it[Key.Appearance] = value.name.lowercase() }
    }

    suspend fun setAutoCrono(value: Boolean) {
        dataStore.edit { it[Key.AutoCrono] = value }
    }

    suspend fun setShowCrono(value: Boolean) {
        dataStore.edit { it[Key.ShowCrono] = value }
    }

    suspend fun setBookView(value: BookViewMode) {
        dataStore.edit { it[Key.BookView] = value.rawValue }
    }

    suspend fun setMeanCharactersPerHour(value: Double?) {
        dataStore.edit { prefs ->
            if (value != null) {
                prefs[Key.MeanSpeed] = value
            } else {
                prefs.remove(Key.MeanSpeed)
            }
        }
    }

    suspend fun setBoard(flag: BoardFlag, value: Boolean) {
        dataStore.edit { prefs -> prefs[boardKey(flag)] = value }
    }

    suspend fun setIdleTimeout(value: Int) {
        dataStore.edit { it[Key.IdleTimeout] = value }
    }
}
