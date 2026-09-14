package es.manabe.yomiyasu.core.session

import es.manabe.yomiyasu.core.networking.ApiClient
import es.manabe.yomiyasu.core.networking.ApiException
import es.manabe.yomiyasu.core.services.SocketService
import kotlinx.coroutines.test.runTest
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import okhttp3.OkHttpClient
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class SessionStoreTest {

    private class MemoryTokenStore : TokenStore {
        val values = mutableMapOf<String, String>()

        override fun getString(key: String): String? = values[key]

        override fun setString(key: String, value: String) {
            values[key] = value
        }

        override fun remove(key: String) {
            values.remove(key)
        }
    }

    private lateinit var server: MockWebServer
    private lateinit var tokenStore: MemoryTokenStore
    private lateinit var session: SessionStore

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()

        tokenStore = MemoryTokenStore()

        val api = ApiClient(
            baseUrl = server.url("/"),
            client = OkHttpClient(),
        )

        val socket = SocketService().apply { enabled = false }
        session = SessionStore(api = api, tokenStore = tokenStore, socket = socket)
    }

    @After
    fun tearDown() {
        server.close()
    }

    private val loginBody = """
        {"status":"ok","uuid":"uuid-1","user":{"_id":"u1","username":"alex","email":"a@b.c","admin":false},
         "accessToken":"access-1","refreshToken":"refresh-1"}
    """.trimIndent()

    @Test
    fun `bootstrap without tokens logs out`() = runTest {
        session.bootstrap()

        assertTrue(session.state.value is SessionStore.State.LoggedOut)
        assertTrue(session.uuid.isNotEmpty())
        assertEquals(session.uuid, tokenStore.getString("uuid"))
    }

    @Test
    fun `login stores tokens and user`() = runTest {
        session.bootstrap()

        server.enqueue(MockResponse(code = 200, body = loginBody))

        session.login("alex", "secret")

        val state = session.state.value
        assertTrue(state is SessionStore.State.LoggedIn)
        assertEquals("u1", (state as SessionStore.State.LoggedIn).user.id)
        assertEquals("access-1", tokenStore.getString("accessToken"))
        assertEquals("refresh-1", tokenStore.getString("refreshToken"))

        val request = server.takeRequest()
        assertEquals("/api/auth/login", request.url.encodedPath)
        assertEquals("body", request.headers["X-Token-Transport"])
        assertTrue(request.body!!.utf8().contains("\"usernameOrEmail\":\"alex\""))
    }

    @Test
    fun `bootstrap with stored refresh token validates with me`() = runTest {
        tokenStore.setString("refreshToken", "refresh-1")
        tokenStore.setString("accessToken", "access-1")

        server.enqueue(
            MockResponse(
                code = 200,
                body = """{"_id":"u1","username":"alex","email":"a@b.c","admin":false}""",
            ),
        )

        session.bootstrap()

        val state = session.state.value
        assertTrue(state is SessionStore.State.LoggedIn)
        assertEquals("access-1", session.accessToken)

        val request = server.takeRequest()
        assertEquals("/api/auth/me", request.url.encodedPath)
        assertEquals("Bearer access-1", request.headers["Authorization"])
    }

    @Test
    fun `bootstrap with invalid token clears session with notice`() = runTest {
        tokenStore.setString("refreshToken", "refresh-1")

        server.enqueue(MockResponse(code = 401, body = """{"statusCode":401}"""))
        server.enqueue(MockResponse(code = 403, body = """{"statusCode":403}"""))

        session.bootstrap()

        assertTrue(session.state.value is SessionStore.State.LoggedOut)
        assertEquals(SessionStore.SESSION_EXPIRED_MESSAGE, session.notice.value)
        assertNull(tokenStore.getString("refreshToken"))
    }

    @Test
    fun `refresh rotates tokens`() = runTest {
        session.bootstrap()
        server.enqueue(MockResponse(code = 200, body = loginBody))
        session.login("alex", "secret")
        server.takeRequest()

        server.enqueue(
            MockResponse(
                code = 200,
                body = """{"status":"ok","uuid":"uuid-1","accessToken":"access-2","refreshToken":"refresh-2"}""",
            ),
        )

        session.refreshTokens()

        assertEquals("access-2", session.accessToken)
        assertEquals("refresh-2", tokenStore.getString("refreshToken"))

        val request = server.takeRequest()
        assertEquals("/api/auth/refresh", request.url.encodedPath)
        assertEquals("Bearer refresh-1", request.headers["Authorization"])
        assertEquals("body", request.headers["X-Token-Transport"])
    }

    @Test
    fun `refresh forbidden expires session`() = runTest {
        session.bootstrap()
        server.enqueue(MockResponse(code = 200, body = loginBody))
        session.login("alex", "secret")
        server.takeRequest()

        server.enqueue(MockResponse(code = 403, body = """{"statusCode":403}"""))

        val error = runCatching { session.refreshTokens() }.exceptionOrNull()

        assertTrue(error is ApiException.SessionExpired)
        assertTrue(session.state.value is SessionStore.State.LoggedOut)
        assertNull(tokenStore.getString("accessToken"))
        assertEquals(SessionStore.SESSION_EXPIRED_MESSAGE, session.notice.value)
    }

    @Test
    fun `401 request refreshes and retries through session`() = runTest {
        session.bootstrap()
        server.enqueue(MockResponse(code = 200, body = loginBody))
        session.login("alex", "secret")
        server.takeRequest()

        server.enqueue(MockResponse(code = 401, body = """{"statusCode":401}"""))
        server.enqueue(
            MockResponse(
                code = 200,
                body = """{"status":"ok","uuid":"uuid-1","accessToken":"access-2","refreshToken":"refresh-2"}""",
            ),
        )
        server.enqueue(
            MockResponse(
                code = 200,
                body = """{"_id":"u1","username":"alex","email":"a@b.c","admin":false}""",
            ),
        )

        val api = ApiClient(baseUrl = server.url("/"), client = OkHttpClient())
        api.authProvider = session
        val user = api.send(
            es.manabe.yomiyasu.core.networking.Endpoint.get("api/auth/me"),
            es.manabe.yomiyasu.core.models.AuthUser.serializer(),
        )

        assertEquals("u1", user.id)
        assertEquals("access-2", session.accessToken)
    }

    @Test
    fun `logout clears tokens`() = runTest {
        session.bootstrap()
        server.enqueue(MockResponse(code = 200, body = loginBody))
        session.login("alex", "secret")
        server.takeRequest()

        server.enqueue(MockResponse(code = 200, body = """{"status":"ok"}"""))

        session.logout()

        assertTrue(session.state.value is SessionStore.State.LoggedOut)
        assertNull(tokenStore.getString("accessToken"))
        assertNull(tokenStore.getString("refreshToken"))
        assertNotNull(tokenStore.getString("uuid"))

        val request = server.takeRequest()
        assertEquals("/api/auth/logout", request.url.encodedPath)
    }

    @Test
    fun `update username updates state`() = runTest {
        session.bootstrap()
        server.enqueue(MockResponse(code = 200, body = loginBody))
        session.login("alex", "secret")

        session.updateUsername("nuevo")

        val state = session.state.value as SessionStore.State.LoggedIn
        assertEquals("nuevo", state.user.username)
    }
}
