package es.manabe.yomiyasu.core.services

import es.manabe.yomiyasu.core.models.Book
import es.manabe.yomiyasu.core.networking.ApiClient
import es.manabe.yomiyasu.core.networking.YomiyasuJson
import es.manabe.yomiyasu.core.readers.ImageFolderPages
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import org.junit.Assert.assertEquals
import org.junit.Test

class StaticUrlsTest {

    private val urls = StaticUrls(
        ApiClient(
            baseUrl = "https://example.test/".toHttpUrl(),
            client = OkHttpClient(),
        ),
    )

    private fun book(json: String): Book = YomiyasuJson.decodeFromString(Book.serializer(), json)

    @Test
    fun `page url of an image book includes the images folder`() {
        val imageBook = book(
            """{"_id":"b1","visibleName":"Vol 1","variant":"manga","seriePath":"Serie",
               "imagesFolder":"Vol 1","format":"images"}""",
        )
        val page = ImageFolderPages.makeBook(listOf("001.jpg"), "Vol 1").pages.first()

        assertEquals(
            "https://example.test/api/static/mangas/Serie/Vol%201/001.jpg",
            urls.bookImage(imageBook, page.imagePath)?.toString(),
        )
    }

    @Test
    fun `page url of a mokuro book keeps the path parsed from the html`() {
        val mokuroBook = book(
            """{"_id":"b2","visibleName":"Vol 2","variant":"manga","seriePath":"Serie",
               "imagesFolder":"Vol 2","format":"mokuro"}""",
        )

        assertEquals(
            "https://example.test/api/static/mangas/Serie/Vol%202/001.jpg",
            urls.bookImage(mokuroBook, "Vol 2/001.jpg")?.toString(),
        )
    }
}
