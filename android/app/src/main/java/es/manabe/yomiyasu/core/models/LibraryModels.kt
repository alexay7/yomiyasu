package es.manabe.yomiyasu.core.models

import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.descriptors.buildClassSerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.jsonObject

@Serializable
enum class Variant {
    @SerialName("manga")
    Manga,

    @SerialName("novela")
    Novela,
    ;

    val title: String
        get() = when (this) {
            Manga -> "Manga"
            Novela -> "Novela"
        }

    val staticFolder: String
        get() = when (this) {
            Manga -> "mangas"
            Novela -> "novelas"
        }
}

@Serializable
enum class LibraryVariant(val rawValue: String) {
    @SerialName("manga")
    Manga("manga"),

    @SerialName("novela")
    Novela("novela"),

    @SerialName("all")
    All("all"),
    ;

    val title: String
        get() = when (this) {
            Manga -> "Mangas"
            Novela -> "Novelas"
            All -> "Todo"
        }
}

@Serializable
enum class MainView(val rawValue: String) {
    @SerialName("manga")
    Manga("manga"),

    @SerialName("novels")
    Novels("novels"),

    @SerialName("both")
    Both("both"),
    ;

    val title: String
        get() = when (this) {
            Manga -> "Solo manga"
            Novels -> "Solo novelas"
            Both -> "Manga y novelas"
        }
}

@Serializable
enum class SerieStatus(val rawValue: String) {
    @SerialName("PUBLISHING")
    Publishing("PUBLISHING"),

    @SerialName("ENDED")
    Ended("ENDED"),
    ;

    val title: String
        get() = when (this) {
            Publishing -> "En publicación"
            Ended -> "Finalizada"
        }
}

@Serializable
enum class ProgressStatus {
    @SerialName("unread")
    Unread,

    @SerialName("reading")
    Reading,

    @SerialName("completed")
    Completed,
    ;

    val title: String
        get() = when (this) {
            Unread -> "Sin leer"
            Reading -> "Leyendo"
            Completed -> "Leído"
        }

    val key: String
        get() = when (this) {
            Unread -> "unread"
            Reading -> "reading"
            Completed -> "completed"
        }
}

enum class ProgressFilter(val rawValue: String?) {
    All(null),
    Unread("unread"),
    Reading("reading"),
    Completed("completed"),
    ;

    val title: String
        get() = when (this) {
            All -> "Todos"
            Unread -> "Sin leer"
            Reading -> "Leyendo"
            Completed -> "Leídos"
        }
}

data class SortValue(val key: String, val descending: Boolean) {
    val rawValue: String
        get() = if (descending) "!$key" else key

    companion object {
        val SeriesDefault = SortValue("sortName", false)
        val SeriesNewest = SortValue("_id", true)
        val SeriesRecent = SortValue("lastModifiedDate", true)
        val BooksDefault = SortValue("sortName", false)
        val BooksNewest = SortValue("_id", true)
    }
}

@Serializable
data class ReadlistEntry(
    @SerialName("_id") val id: String? = null,
    val serie: String? = null,
    val addedDate: String? = null,
)

object ReadlistValueSerializer : KSerializer<ReadlistValue> {
    override val descriptor: SerialDescriptor = buildClassSerialDescriptor("ReadlistValue")

    override fun deserialize(decoder: Decoder): ReadlistValue {
        val jsonDecoder = decoder as? JsonDecoder
            ?: return ReadlistValue(false)
        val element: JsonElement = jsonDecoder.decodeJsonElement()

        return when (element) {
            is JsonPrimitive -> ReadlistValue(element.booleanOrNull ?: false)
            is JsonObject -> {
                val id = element["_id"]
                ReadlistValue(id != null && id !is JsonNull)
            }
            else -> ReadlistValue(false)
        }
    }

    override fun serialize(encoder: Encoder, value: ReadlistValue) {
        encoder.encodeBoolean(value.isInReadlist)
    }
}

@Serializable(with = ReadlistValueSerializer::class)
data class ReadlistValue(val isInReadlist: Boolean)

object CurrentBookSerializer : KSerializer<CurrentBook> {
    override val descriptor: SerialDescriptor = buildClassSerialDescriptor("CurrentBook")

    override fun deserialize(decoder: Decoder): CurrentBook {
        val jsonDecoder = decoder as? JsonDecoder
            ?: throw IllegalArgumentException("CurrentBook requiere un decoder JSON")
        val element: JsonElement = jsonDecoder.decodeJsonElement()

        return when (element) {
            is JsonPrimitive -> CurrentBook.Id(element.content)
            is JsonObject -> CurrentBook.BookValue(
                jsonDecoder.json.decodeFromJsonElement(Book.serializer(), element),
            )
            else -> throw IllegalArgumentException("CurrentBook inválido")
        }
    }

    override fun serialize(encoder: Encoder, value: CurrentBook) {
        when (value) {
            is CurrentBook.Id -> encoder.encodeString(value.id)
            is CurrentBook.BookValue -> encoder.encodeSerializableValue(Book.serializer(), value.book)
        }
    }
}

@Serializable(with = CurrentBookSerializer::class)
sealed class CurrentBook {
    abstract val id: String

    data class Id(override val id: String) : CurrentBook()
    data class BookValue(val book: Book) : CurrentBook() {
        override val id: String get() = book.id
    }
}

@Serializable
data class Review(
    @SerialName("_id") val id: String,
    val user: String? = null,
    val serie: String? = null,
    val userLevel: String? = null,
    val difficulty: Int? = null,
    val valoration: Int? = null,
    val comment: String? = null,
    val name: String? = null,
)

@Serializable
data class Serie(
    @SerialName("_id") val id: String,
    val path: String? = null,
    val variant: Variant? = null,
    val visibleName: String = "",
    val sortName: String? = null,
    val bookCount: Int? = null,
    val difficulty: Double? = null,
    val createdDate: String? = null,
    val lastModifiedDate: String? = null,
    val status: SerieStatus? = null,
    val summary: String? = null,
    val authors: List<String>? = null,
    val genres: List<String>? = null,
    val missing: Boolean? = null,
    val valoration: Double? = null,
    val alternativeNames: List<String>? = null,
    val unreadBooks: Int? = null,
    val paused: Boolean? = null,
    val readlist: ReadlistValue? = null,
    val thumbnailPath: String? = null,
    val currentBook: CurrentBook? = null,
    val reviews: List<Review>? = null,
) {
    val isInReadlist: Boolean get() = readlist?.isInReadlist ?: false
    val unreadCount: Int get() = unreadBooks ?: 0
    val totalBooks: Int get() = bookCount ?: 0
    val isPaused: Boolean get() = paused ?: false
    val displayGenres: List<String> get() = genres ?: emptyList()
    val displayAuthors: List<String> get() = authors ?: emptyList()

    val progressFraction: Double
        get() = if (totalBooks > 0) {
            (totalBooks - unreadCount).toDouble() / totalBooks.toDouble()
        } else {
            0.0
        }

    val plainSummary: String
        get() = (summary ?: "")
            .replace(Regex("<[^>]+>"), "")
            .trim()
}

@Serializable
data class Book(
    @SerialName("_id") val id: String,
    val path: String? = null,
    val serie: String? = null,
    val seriePath: String? = null,
    val pages: Int? = null,
    val visibleName: String = "",
    val sortName: String? = null,
    val imagesFolder: String? = null,
    val thumbnailPath: String? = null,
    val createdDate: String? = null,
    val releaseDate: String? = null,
    val lastModifiedDate: String? = null,
    val missing: Boolean? = null,
    val characters: Int? = null,
    val pageChars: List<Int>? = null,
    val variant: Variant? = null,
    val mokured: Boolean? = null,
    val format: String? = null,
    val pagePaths: List<String>? = null,
    val status: ProgressStatus? = null,
    val lastProgress: ReadProgress? = null,
    val readlist: ReadlistValue? = null,
    val type: String? = null,
) {
    val resolvedStatus: ProgressStatus get() = status ?: ProgressStatus.Unread
    val isMokured: Boolean get() = mokured ?: false

    /** Tomo de solo imágenes, sin html de mokuro. Ausente = mokuro. */
    val isImageFolder: Boolean get() = format == "images"

    val progressFraction: Double
        get() {
            val pageCount = pages
            val currentPage = lastProgress?.currentPage
            if (pageCount != null && pageCount > 0 && currentPage != null) {
                return minOf(1.0, currentPage.toDouble() / pageCount.toDouble())
            }
            val totalChars = characters
            val readCharacters = lastProgress?.characters
            if (totalChars != null && totalChars > 0 && readCharacters != null) {
                return minOf(1.0, readCharacters.toDouble() / totalChars.toDouble())
            }
            return 0.0
        }
}

@Serializable
data class ReadProgress(
    @SerialName("_id") val id: String? = null,
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
)

@Serializable
data class SeriesPage(
    val data: List<Serie> = emptyList(),
    val pages: Int = 1,
)

@Serializable
data class AlphabetGroup(
    val group: String,
    val count: Int = 0,
) {
    val displayName: String
        get() = when (group) {
            "all" -> "Todo"
            "#" -> "#"
            else -> group.uppercase()
        }
}

@Serializable
data class GenresAndArtists(
    val genres: List<String> = emptyList(),
    val authors: List<String> = emptyList(),
)

@Serializable
data class ReadlistRequest(val serie: String)

@Serializable
class EmptyResponse
