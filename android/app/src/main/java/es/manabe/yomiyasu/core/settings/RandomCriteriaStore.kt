package es.manabe.yomiyasu.core.settings

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import es.manabe.yomiyasu.core.models.LibraryVariant
import es.manabe.yomiyasu.core.models.ProgressFilter
import es.manabe.yomiyasu.core.models.SerieStatus
import es.manabe.yomiyasu.core.models.SeriesQuery
import kotlinx.coroutines.flow.first
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
data class RandomCriteria(
    val genre: String? = null,
    val author: String? = null,
    val status: String? = null,
    val firstLetter: String? = null,
    val minDifficulty: Int? = null,
    val maxDifficulty: Int? = null,
    val readprogress: String? = null,
    val readlistOnly: Boolean = false,
) {
    fun applyingTo(query: SeriesQuery): SeriesQuery = query.copy(
        genre = genre,
        author = author,
        status = status?.let { raw -> SerieStatus.entries.firstOrNull { it.rawValue == raw } },
        firstLetter = firstLetter,
        minDifficulty = minDifficulty,
        maxDifficulty = maxDifficulty,
        readprogress = readprogress?.let { raw ->
            ProgressFilter.entries.firstOrNull { it.rawValue == raw }
        },
        readlistOnly = readlistOnly,
    )

    companion object {
        fun from(query: SeriesQuery): RandomCriteria = RandomCriteria(
            genre = query.genre,
            author = query.author,
            status = query.status?.rawValue,
            firstLetter = query.firstLetter,
            minDifficulty = query.minDifficulty,
            maxDifficulty = query.maxDifficulty,
            readprogress = query.readprogress?.rawValue,
            readlistOnly = query.readlistOnly,
        )
    }
}

@Singleton
class RandomCriteriaStore @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) {
    private val json = Json

    suspend fun save(criteria: RandomCriteria, variant: LibraryVariant) {
        dataStore.edit { prefs -> prefs[key(variant)] = json.encodeToString(criteria) }
    }

    suspend fun criteria(variant: LibraryVariant): RandomCriteria? {
        val raw = dataStore.data.first()[key(variant)] ?: return null
        return runCatching { json.decodeFromString<RandomCriteria>(raw) }.getOrNull()
    }

    private fun key(variant: LibraryVariant) = stringPreferencesKey("randomCriteria.${variant.rawValue}")
}
