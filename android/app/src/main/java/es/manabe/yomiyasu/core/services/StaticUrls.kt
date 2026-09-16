package es.manabe.yomiyasu.core.services

import es.manabe.yomiyasu.core.models.Book
import es.manabe.yomiyasu.core.models.Serie
import es.manabe.yomiyasu.core.models.Variant
import es.manabe.yomiyasu.core.networking.ApiClient
import okhttp3.HttpUrl
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StaticUrls @Inject constructor(
    private val api: ApiClient,
) {

    fun url(path: String): HttpUrl? {
        val baseUrl = api.activeBaseUrl ?: return null
        val builder = baseUrl.newBuilder()
            .addPathSegment("api")
            .addPathSegment("static")

        path.trim('/').split('/').forEach { segment ->
            if (segment.isNotEmpty()) builder.addPathSegment(segment)
        }

        return builder.build()
    }

    fun serieCover(serie: Serie): HttpUrl? {
        val thumbnailPath = serie.thumbnailPath ?: return null
        val folder = if (serie.variant == Variant.Novela) "novelas" else "mangas"
        return url("$folder/$thumbnailPath")
    }

    fun bookCover(book: Book): HttpUrl? {
        val seriePath = book.seriePath ?: return null
        val thumbnailPath = book.thumbnailPath ?: return null

        return when (book.variant) {
            Variant.Novela -> {
                val imagesFolder = book.imagesFolder
                if (book.isMokured && imagesFolder != null) {
                    url("novelas/$seriePath/$imagesFolder/$thumbnailPath")
                } else {
                    url("novelas/$seriePath/$thumbnailPath")
                }
            }
            else -> {
                val imagesFolder = book.imagesFolder ?: return null
                url("mangas/$seriePath/$imagesFolder/$thumbnailPath")
            }
        }
    }

    fun bookHtml(book: Book): HttpUrl? {
        val seriePath = book.seriePath ?: return null
        val path = book.path ?: return null
        val folder = book.variant?.staticFolder ?: "mangas"
        return url("$folder/$seriePath/$path.html")
    }

    fun bookImage(book: Book, imagePath: String): HttpUrl? {
        val seriePath = book.seriePath ?: return null
        val folder = book.variant?.staticFolder ?: "mangas"
        return url("$folder/$seriePath/$imagePath")
    }

    fun bookEpub(book: Book): HttpUrl? {
        val seriePath = book.seriePath ?: return null
        val path = book.path ?: return null
        val folder = book.variant?.staticFolder ?: "novelas"
        return url("$folder/$seriePath/$path.epub")
    }
}
