package es.manabe.yomiyasu.core.services

import es.manabe.yomiyasu.core.networking.ApiClient
import kotlinx.coroutines.test.runTest
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import okhttp3.OkHttpClient
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class ProgressApiTest {

    private lateinit var server: MockWebServer
    private lateinit var api: ProgressApi

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()

        val client = ApiClient(
            baseUrl = server.url("/"),
            client = OkHttpClient(),
        )
        api = ProgressApi(client)
    }

    @After
    fun tearDown() {
        server.close()
    }

    @Test
    fun `streak uses zero based month`() = runTest {
        server.enqueue(MockResponse(code = 200, body = """[]"""))

        api.streak(year = 2026, month = 8)

        val request = server.takeRequest()
        assertEquals("/api/readprogress/streak/2026/7", request.url.encodedPath)
    }

    @Test
    fun `logs use one based month`() = runTest {
        server.enqueue(MockResponse(code = 200, body = """[]"""))

        api.logs(year = 2026, month = 8, day = 15)

        val request = server.takeRequest()
        assertEquals("/api/readprogress/logs/2026/8/15", request.url.encodedPath)
    }

    @Test
    fun `all sends pagination and handles empty 400`() = runTest {
        server.enqueue(MockResponse(code = 200, body = """{"data":[{"_id":"p1"}],"total":42}"""))

        val (records, total) = api.all(page = 2, limit = 50, sort = "!lastUpdateDate")

        assertEquals(1, records.size)
        assertEquals(42, total)

        val request = server.takeRequest()
        assertEquals("/api/readprogress/all", request.url.encodedPath)
        assertEquals("2", request.url.queryParameter("page"))
        assertEquals("50", request.url.queryParameter("limit"))
        assertEquals("!lastUpdateDate", request.url.queryParameter("sort"))

        server.enqueue(MockResponse(code = 400, body = """{"statusCode":400}"""))
        val (emptyRecords, emptyTotal) = api.all(page = 1, limit = 50, sort = "!lastUpdateDate")
        assertTrue(emptyRecords.isEmpty())
        assertEquals(0, emptyTotal)
    }

    @Test
    fun `neighboring book returns null on sentinel`() = runTest {
        server.enqueue(MockResponse(code = 200, body = """{"_id":"end"}"""))

        val next = api.neighboringBook("b1", forward = true)

        assertNull(next)
        assertEquals("/api/books/b1/next", server.takeRequest().url.encodedPath)
    }

    @Test
    fun `neighboring book decodes real book`() = runTest {
        server.enqueue(
            MockResponse(
                code = 200,
                body = """{"_id":"b2","visibleName":"Tomo 2","pages":180,"serie":"s1"}""",
            ),
        )

        val previous = api.neighboringBook("b2", forward = false)

        assertEquals("b2", previous?.id)
        assertEquals("/api/books/b2/prev", server.takeRequest().url.encodedPath)
    }

    @Test
    fun `progress for book decodes and treats missing id as none`() = runTest {
        server.enqueue(MockResponse(code = 200, body = """{"_id":"p1","book":"b1","currentPage":10}"""))
        server.enqueue(MockResponse(code = 200, body = """{}"""))

        val progress = api.progressForBook("b1")
        assertEquals(10, progress?.currentPage)

        val none = api.progressForBook("b1")
        assertNull(none)

        val request = server.takeRequest()
        assertEquals("/api/readprogress", request.url.encodedPath)
        assertEquals("b1", request.url.queryParameter("book"))
    }

    @Test
    fun `save posts progress request`() = runTest {
        server.enqueue(MockResponse(code = 201, body = """{}"""))

        api.save(
            ReadProgressRequest(
                book = "b1",
                time = 120,
                currentPage = 15,
                characters = 300,
                status = "reading",
            ),
        )

        val request = server.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/readprogress", request.url.encodedPath)

        val body = request.body!!.utf8()
        assertTrue(body.contains("\"currentPage\":15"))
        assertTrue(body.contains("\"characters\":300"))
        assertTrue(body.contains("\"status\":\"reading\""))
    }

    @Test
    fun `speed hits serie endpoint`() = runTest {
        server.enqueue(MockResponse(code = 200, body = """[{"_id":"p1","meanReadSpeed":430.0}]"""))

        val records = api.speed("s1")

        assertEquals(430.0, records.first().meanReadSpeed ?: 0.0, 0.001)
        assertEquals("/api/readprogress/serie/s1/speed", server.takeRequest().url.encodedPath)
    }
}
