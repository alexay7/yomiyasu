package es.manabe.yomiyasu.core.services

import es.manabe.yomiyasu.core.models.Book
import es.manabe.yomiyasu.core.models.MonthlyGraphs
import es.manabe.yomiyasu.core.models.ProgressRecord
import es.manabe.yomiyasu.core.models.ReadProgress
import es.manabe.yomiyasu.core.models.StreakDay
import es.manabe.yomiyasu.core.models.UserStats
import es.manabe.yomiyasu.core.networking.ApiClient
import es.manabe.yomiyasu.core.networking.ApiException
import es.manabe.yomiyasu.core.networking.Endpoint
import es.manabe.yomiyasu.core.networking.jsonBody
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
data class ReadProgressRequest(
    val book: String,
    val time: Int? = null,
    val currentPage: Int,
    val characters: Int,
    val status: String,
    val endDate: String? = null,
)

@Serializable
private data class ProgressPage(
    val data: List<ProgressRecord> = emptyList(),
    val total: Int = 0,
)

@Serializable
private data class Probe(@SerialName("_id") val id: String)

@Singleton
class ProgressApi @Inject constructor(
    private val api: ApiClient,
) {

    suspend fun progressForBook(bookId: String): ReadProgress? {
        val progress = api.send(
            Endpoint.get("api/readprogress", listOf("book" to bookId)),
            ReadProgress.serializer(),
        )
        return if (progress.id == null) null else progress
    }

    suspend fun save(request: ReadProgressRequest) {
        api.send(
            Endpoint.post("api/readprogress", body = jsonBody(request)),
            es.manabe.yomiyasu.core.models.EmptyResponse.serializer(),
        )
    }

    suspend fun markCompleted(book: Book, currentPage: Int? = null, characters: Int? = null) {
        save(
            ReadProgressRequest(
                book = book.id,
                time = null,
                currentPage = currentPage ?: book.pages ?: 0,
                characters = characters ?: book.characters ?: 0,
                status = "completed",
                endDate = Instant.now().toString(),
            ),
        )
    }

    suspend fun markUnread(book: Book) {
        save(
            ReadProgressRequest(
                book = book.id,
                time = null,
                currentPage = 0,
                characters = 0,
                status = "unread",
            ),
        )
    }

    suspend fun neighboringBook(bookId: String, forward: Boolean): Book? {
        val action = if (forward) "next" else "prev"
        val data = api.sendBytes(Endpoint.get("api/books/$bookId/$action"))

        try {
            val probe = api.json.decodeFromString(Probe.serializer(), data.decodeToString())
            if (probe.id == "end" || probe.id == "start") return null
        } catch (_: Exception) {
            // No era un centinela: se intenta decodificar como libro
        }

        return try {
            api.json.decodeFromString(Book.serializer(), data.decodeToString())
        } catch (error: Exception) {
            throw ApiException.Decoding(error)
        }
    }

    suspend fun stats(): UserStats =
        api.send(Endpoint.get("api/readprogress/mystats"), UserStats.serializer())

    suspend fun graphs(): MonthlyGraphs =
        api.send(Endpoint.get("api/readprogress/mygraphs"), MonthlyGraphs.serializer())

    /**
     * El endpoint usa meses base 0 (`new Date(year, month)` en el backend),
     * a diferencia de `logs/:year/:month/:day`, que usa base 1 ($month de Mongo).
     */
    suspend fun streak(year: Int, month: Int): List<StreakDay> = api.send(
        Endpoint.get("api/readprogress/streak/$year/${month - 1}"),
        ListSerializer(StreakDay.serializer()),
    )

    suspend fun logs(year: Int, month: Int, day: Int): List<ProgressRecord> = api.send(
        Endpoint.get("api/readprogress/logs/$year/$month/$day"),
        ListSerializer(ProgressRecord.serializer()),
    )

    suspend fun all(page: Int, limit: Int, sort: String): Pair<List<ProgressRecord>, Int> {
        return try {
            val response = api.send(
                Endpoint.get(
                    "api/readprogress/all",
                    listOf(
                        "page" to page.toString(),
                        "limit" to limit.toString(),
                        "sort" to sort,
                    ),
                ),
                ProgressPage.serializer(),
            )
            response.data to response.total
        } catch (error: ApiException) {
            if (error is ApiException.Http && error.status == 400) {
                emptyList<ProgressRecord>() to 0
            } else {
                throw error
            }
        }
    }

    suspend fun speed(serieId: String): List<ProgressRecord> = api.send(
        Endpoint.get("api/readprogress/serie/$serieId/speed"),
        ListSerializer(ProgressRecord.serializer()),
    )
}
