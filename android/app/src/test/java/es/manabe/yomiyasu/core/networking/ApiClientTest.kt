package es.manabe.yomiyasu.core.networking

import kotlinx.coroutines.test.runTest
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.serializer
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class ApiClientTest {

    @Serializable
    private data class Status(val status: String)

    private lateinit var server: MockWebServer

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
    }

    @After
    fun tearDown() {
        server.close()
    }

    private class FakeProvider(
        override var accessToken: String?,
        private val refreshedToken: String?,
        private val failRefresh: Boolean = false,
    ) : ApiClient.AuthTokenProvider {
        var refreshCount = 0

        override suspend fun refreshTokens() {
            refreshCount++
            if (failRefresh) throw ApiException.SessionExpired()
            accessToken = refreshedToken
        }
    }

    @Test
    fun `401 triggers refresh and retries once`() = runTest {
        server.enqueue(MockResponse(code = 401, body = """{"statusCode":401,"message":"expired"}"""))
        server.enqueue(MockResponse(code = 200, body = """{"status":"ok"}"""))

        val api = ApiClient(
            baseUrl = server.url("/"),
            client = okhttp3.OkHttpClient(),
        )
        val provider = FakeProvider(accessToken = "token-1", refreshedToken = "token-2")
        api.authProvider = provider

        val result = api.send(Endpoint.get("api/auth/me"), Status.serializer())

        assertEquals("ok", result.status)
        assertEquals(1, provider.refreshCount)

        val first = server.takeRequest()
        assertEquals("Bearer token-1", first.headers["Authorization"])

        val second = server.takeRequest()
        assertEquals("Bearer token-2", second.headers["Authorization"])
    }

    @Test
    fun `401 without refresh leaves error`() = runTest {
        server.enqueue(MockResponse(code = 401, body = """{"statusCode":401,"message":"denied"}"""))

        val api = ApiClient(
            baseUrl = server.url("/"),
            client = okhttp3.OkHttpClient(),
        )
        api.authProvider = null

        val error = runCatching {
            api.send(Endpoint.get("api/auth/me"), Status.serializer())
        }.exceptionOrNull()

        assertTrue(error is ApiException.Http)
        assertEquals(401, (error as ApiException.Http).status)
    }

    @Test
    fun `session expired from refresh propagates`() = runTest {
        server.enqueue(MockResponse(code = 401, body = """{"statusCode":401}"""))

        val api = ApiClient(
            baseUrl = server.url("/"),
            client = okhttp3.OkHttpClient(),
        )
        api.authProvider = FakeProvider(
            accessToken = "token-1",
            refreshedToken = null,
            failRefresh = true,
        )

        val error = runCatching {
            api.send(Endpoint.get("api/auth/me"), Status.serializer())
        }.exceptionOrNull()

        assertTrue(error is ApiException.SessionExpired)
    }

    @Test
    fun `error envelope message is exposed in user message`() = runTest {
        server.enqueue(
            MockResponse(
                code = 400,
                body = """{"statusCode":400,"message":["primero","segundo"]}""",
            ),
        )

        val api = ApiClient(
            baseUrl = server.url("/"),
            client = okhttp3.OkHttpClient(),
        )

        val error = runCatching {
            api.send(Endpoint.get("api/whatever"), Status.serializer())
        }.exceptionOrNull() as ApiException.Http

        assertEquals("primero\nsegundo", error.userMessage)
    }

    @Test
    fun `query items and json body are sent`() = runTest {
        server.enqueue(MockResponse(code = 200, body = """{"status":"ok"}"""))

        val api = ApiClient(
            baseUrl = server.url("/"),
            client = okhttp3.OkHttpClient(),
        )

        api.send(
            Endpoint.post(
                "api/readprogress",
                body = jsonBody(Status(status = "reading")),
            ),
            Status.serializer(),
            authorized = false,
        )

        val request = server.takeRequest()
        assertEquals("/api/readprogress", request.url.encodedPath)
        assertEquals("POST", request.method)
        assertTrue(request.body!!.utf8().contains("\"status\":\"reading\""))
    }

    @Test
    fun `path segments with japanese names are encoded`() = runTest {
        server.enqueue(MockResponse(code = 200, body = """{"status":"ok"}"""))

        val api = ApiClient(
            baseUrl = server.url("/"),
            client = okhttp3.OkHttpClient(),
        )

        api.send(
            Endpoint.get("api/static/mangas/推しの子/001.html"),
            Status.serializer(),
        )

        val request = server.takeRequest()
        assertEquals(
            listOf("api", "static", "mangas", "推しの子", "001.html"),
            request.url.pathSegments,
        )
    }

    @Test
    fun `serializer builtins compile`() {
        String.serializer()
    }
}
