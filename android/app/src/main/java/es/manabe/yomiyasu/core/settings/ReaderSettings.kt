package es.manabe.yomiyasu.core.settings

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.doublePreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import es.manabe.yomiyasu.core.di.ApplicationScope
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject
import javax.inject.Singleton

enum class ZoomMode(val rawValue: String) {
    FitScreen("fit to screen"),
    FitWidth("fit to width"),
    Original("original size"),
    Keep("keep zoom level"),
    ;

    val title: String
        get() = when (this) {
            FitScreen -> "Ajustar a pantalla"
            FitWidth -> "Ajustar al ancho"
            Original -> "Tamaño original"
            Keep -> "Mantener zoom"
        }
}

enum class DictionaryLookupMode(val rawValue: String) {
    Word("word"),
    Sentence("sentence"),
    ;

    val title: String
        get() = when (this) {
            Word -> "Palabra"
            Sentence -> "Frase"
        }
}

enum class ReaderFont(val rawValue: String, val fontAsset: String?) {
    Ipa("ipa", "ipaexg.ttf"),
    ZenAntique("zenAntique", "ZenAntique.ttf"),
    System("system", null),
    ;

    val title: String
        get() = when (this) {
            Ipa -> "IPAex Gothic"
            ZenAntique -> "Zen Antique"
            System -> "Sistema"
        }
}

enum class NovelWritingMode(val rawValue: String) {
    Automatic("automatic"),
    Horizontal("horizontal"),
    Vertical("vertical"),
    ;

    val title: String
        get() = when (this) {
            Automatic -> "Automático"
            Horizontal -> "Horizontal"
            Vertical -> "Vertical"
        }
}

enum class NovelTheme(val rawValue: String) {
    System("system"),
    Light("light"),
    Dark("dark"),
    Sepia("sepia"),
    ;

    val title: String
        get() = when (this) {
            System -> "Sistema"
            Light -> "Claro"
            Dark -> "Oscuro"
            Sepia -> "Sepia"
        }
}

enum class NovelFont(val rawValue: String) {
    Original("original"),
    Serif("serif"),
    Sans("sans"),
    ;

    val title: String
        get() = when (this) {
            Original -> "Original"
            Serif -> "Serif"
            Sans -> "Sans"
        }
}

data class ReaderSettingsData(
    val r2l: Boolean = true,
    val doublePage: Boolean = true,
    val hasCover: Boolean = true,
    val defaultZoomMode: ZoomMode = ZoomMode.FitScreen,
    val displayOCR: Boolean = false,
    val textBoxBorders: Boolean = false,
    val fontSize: Double = 0.0,
    val toggleOCRTextBoxes: Boolean = true,
    val panAndZoom: Boolean = true,
    val nativeDictionary: Boolean = true,
    val dictionaryVersion: DictionaryLookupMode = DictionaryLookupMode.Word,
    val scrollChange: Boolean = true,
    val font: ReaderFont = ReaderFont.Ipa,
    val novelWritingMode: NovelWritingMode = NovelWritingMode.Automatic,
    val novelTheme: NovelTheme = NovelTheme.System,
    val novelFontSize: Double = 100.0,
    val novelFont: NovelFont = NovelFont.Original,
    val novelScroll: Boolean = false,
)

@Singleton
class ReaderSettings @Inject constructor(
    private val dataStore: DataStore<Preferences>,
    @ApplicationScope private val scope: CoroutineScope,
) {
    private object Key {
        val R2l = booleanPreferencesKey("reader.r2l")
        val DoublePage = booleanPreferencesKey("reader.doublePage")
        val HasCover = booleanPreferencesKey("reader.hasCover")
        val DefaultZoomMode = stringPreferencesKey("reader.defaultZoomMode")
        val DisplayOCR = booleanPreferencesKey("reader.displayOCR")
        val TextBoxBorders = booleanPreferencesKey("reader.textBoxBorders")
        val FontSize = doublePreferencesKey("reader.fontSize")
        val ToggleOCRTextBoxes = booleanPreferencesKey("reader.toggleOCRTextBoxes")
        val PanAndZoom = booleanPreferencesKey("reader.panAndZoom")
        val NativeDictionary = booleanPreferencesKey("reader.nativeDictionary")
        val DictionaryVersion = stringPreferencesKey("reader.dictionaryVersion")
        val ScrollChange = booleanPreferencesKey("reader.scrollChange")
        val Font = stringPreferencesKey("reader.font")
        val NovelWritingMode = stringPreferencesKey("reader.novelWritingMode")
        val NovelTheme = stringPreferencesKey("reader.novelTheme")
        val NovelFontSize = doublePreferencesKey("reader.novelFontSize")
        val NovelFont = stringPreferencesKey("reader.novelFont")
        val NovelScroll = booleanPreferencesKey("reader.novelScroll")
    }

    val flow: StateFlow<ReaderSettingsData> = dataStore.data
        .map { prefs ->
            ReaderSettingsData(
                r2l = prefs[Key.R2l] ?: true,
                doublePage = prefs[Key.DoublePage] ?: true,
                hasCover = prefs[Key.HasCover] ?: true,
                defaultZoomMode = prefs[Key.DefaultZoomMode]
                    ?.let { value -> ZoomMode.entries.firstOrNull { it.rawValue == value } }
                    ?: ZoomMode.FitScreen,
                displayOCR = prefs[Key.DisplayOCR] ?: false,
                textBoxBorders = prefs[Key.TextBoxBorders] ?: false,
                fontSize = prefs[Key.FontSize] ?: 0.0,
                toggleOCRTextBoxes = prefs[Key.ToggleOCRTextBoxes] ?: true,
                panAndZoom = prefs[Key.PanAndZoom] ?: true,
                nativeDictionary = prefs[Key.NativeDictionary] ?: true,
                dictionaryVersion = prefs[Key.DictionaryVersion]
                    ?.let { value -> DictionaryLookupMode.entries.firstOrNull { it.rawValue == value } }
                    ?: DictionaryLookupMode.Word,
                scrollChange = prefs[Key.ScrollChange] ?: true,
                font = prefs[Key.Font]
                    ?.let { value -> ReaderFont.entries.firstOrNull { it.rawValue == value } }
                    ?: ReaderFont.Ipa,
                novelWritingMode = prefs[Key.NovelWritingMode]
                    ?.let { value -> NovelWritingMode.entries.firstOrNull { it.rawValue == value } }
                    ?: NovelWritingMode.Automatic,
                novelTheme = prefs[Key.NovelTheme]
                    ?.let { value -> NovelTheme.entries.firstOrNull { it.rawValue == value } }
                    ?: NovelTheme.System,
                novelFontSize = prefs[Key.NovelFontSize] ?: 100.0,
                novelFont = prefs[Key.NovelFont]
                    ?.let { value -> NovelFont.entries.firstOrNull { it.rawValue == value } }
                    ?: NovelFont.Original,
                novelScroll = prefs[Key.NovelScroll] ?: false,
            )
        }
        .stateIn(scope, SharingStarted.Eagerly, ReaderSettingsData())

    suspend fun current(): ReaderSettingsData = flow.first()

    suspend fun update(transform: (ReaderSettingsData) -> ReaderSettingsData) {
        val current = current()
        val updated = transform(current)

        dataStore.edit { prefs ->
            prefs[Key.R2l] = updated.r2l
            prefs[Key.DoublePage] = updated.doublePage
            prefs[Key.HasCover] = updated.hasCover
            prefs[Key.DefaultZoomMode] = updated.defaultZoomMode.rawValue
            prefs[Key.DisplayOCR] = updated.displayOCR
            prefs[Key.TextBoxBorders] = updated.textBoxBorders
            prefs[Key.FontSize] = updated.fontSize
            prefs[Key.ToggleOCRTextBoxes] = updated.toggleOCRTextBoxes
            prefs[Key.PanAndZoom] = updated.panAndZoom
            prefs[Key.NativeDictionary] = updated.nativeDictionary
            prefs[Key.DictionaryVersion] = updated.dictionaryVersion.rawValue
            prefs[Key.ScrollChange] = updated.scrollChange
            prefs[Key.Font] = updated.font.rawValue
            prefs[Key.NovelWritingMode] = updated.novelWritingMode.rawValue
            prefs[Key.NovelTheme] = updated.novelTheme.rawValue
            prefs[Key.NovelFontSize] = updated.novelFontSize
            prefs[Key.NovelFont] = updated.novelFont.rawValue
            prefs[Key.NovelScroll] = updated.novelScroll
        }
    }
}
