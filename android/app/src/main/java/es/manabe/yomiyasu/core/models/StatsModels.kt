package es.manabe.yomiyasu.core.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class UserStats(
    val totalMangaBooks: Int = 0,
    val totalNovelaBooks: Int = 0,
    val totalPagesRead: Int = 0,
    val totalCharacters: Int = 0,
    val totalMangaSeries: Int = 0,
    val totalNovelaSeries: Int = 0,
    val totalTimeRead: Double = 0.0,
)

@Serializable
data class MonthlyGraphEntry(
    @SerialName("_id") val monthId: MonthId,
    val totalCharacters: Int = 0,
    val totalTime: Int = 0,
    val meanReadSpeed: Double = 0.0,
    val totalHours: Double = 0.0,
) {
    val id: String get() = "${monthId.year}-${monthId.month}"

    @Serializable
    data class MonthId(
        val year: Int = 0,
        val month: Int = 0,
    )
}

@Serializable
data class MonthlyGraphs(
    val manga: List<MonthlyGraphEntry> = emptyList(),
    val novela: List<MonthlyGraphEntry> = emptyList(),
)

@Serializable
data class StreakDay(
    val dayOfMonth: Int,
    val count: Int = 0,
)

@Serializable
data class ProgressRecord(
    @SerialName("_id") val id: String,
    val book: String? = null,
    val serie: String? = null,
    val startDate: String? = null,
    val lastUpdateDate: String? = null,
    val endDate: String? = null,
    val time: Int? = null,
    val currentPage: Int? = null,
    val status: ProgressStatus? = null,
    val paused: Boolean? = null,
    val characters: Int? = null,
    val variant: Variant? = null,
    val day: Int? = null,
    val month: Int? = null,
    val year: Int? = null,
    val bookInfo: Book? = null,
    val serieInfo: Serie? = null,
    val meanReadSpeed: Double? = null,
) {
    val bookName: String get() = bookInfo?.visibleName ?: "—"
    val serieName: String get() = serieInfo?.visibleName ?: ""
    val resolvedVariant: Variant get() = variant ?: bookInfo?.variant ?: Variant.Manga

    val logLine: String
        get() {
            var text = when (resolvedVariant) {
                Variant.Manga -> ".log manga ${currentPage ?: 1} $bookName"
                Variant.Novela -> ".log lectura ${characters ?: 0} $bookName"
            }
            val minutes = time
            if (minutes != null && minutes > 59) {
                text += ";${minutes / 60}"
            }
            if (resolvedVariant == Variant.Manga) {
                val chars = characters
                if (chars != null && chars > 0) {
                    text += "&$chars"
                }
            }
            return text
        }
}

@Serializable
data class CreateReviewRequest(
    val serie: String,
    val userLevel: String,
    val difficulty: Int,
    val valoration: Int,
    val comment: String,
)

enum class ReviewLevel(val rawValue: String) {
    Beginner("Principiante"),
    N5("N5"),
    N4("N4"),
    N3("N3"),
    N2("N2"),
    N1("N1"),
    N1Plus("N1+"),
}
