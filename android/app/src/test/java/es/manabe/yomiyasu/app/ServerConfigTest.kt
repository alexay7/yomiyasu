package es.manabe.yomiyasu.app

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ServerConfigTest {

    @After
    fun tearDown() {
        ServerConfig.reset()
    }

    @Test
    fun `parse adds https when scheme is missing`() {
        assertEquals(
            "https://manga.example.com/",
            ServerConfig.parse("manga.example.com").toString(),
        )
        assertEquals(
            "https://192.168.1.136:3001/",
            ServerConfig.parse("192.168.1.136:3001").toString(),
        )
    }

    @Test
    fun `parse keeps http and drops path query and fragment`() {
        assertEquals(
            "http://192.168.1.136:3001/",
            ServerConfig.parse("http://192.168.1.136:3001/api/static?x=1#top").toString(),
        )
        assertEquals(
            "https://example.test/",
            ServerConfig.parse("https://example.test/").toString(),
        )
    }

    @Test
    fun `parse rejects invalid values`() {
        assertNull(ServerConfig.parse(""))
        assertNull(ServerConfig.parse("   "))
        assertNull(ServerConfig.parse("ftp://example.test"))
        assertNull(ServerConfig.parse("https://foo bar"))
    }

    @Test
    fun `there is no default server`() {
        assertNull(ServerConfig.resolve(null))
    }

    @Test
    fun `resolve prefers persisted value over build config`() {
        assertEquals(
            "http://persisted.test/",
            ServerConfig.resolve("http://persisted.test").toString(),
        )
    }

    @Test
    fun `intent extras set the server and override the current one`() {
        ServerConfig.applyExtras { key ->
            if (key == "YOMIYASU_SERVER_URL") "http://192.168.1.136:3001" else null
        }

        assertEquals("http://192.168.1.136:3001/", ServerConfig.serverUrl.toString())

        ServerConfig.applyExtras { key ->
            if (key == "YOMIYASU_SERVER_URL") "https://other.test" else null
        }

        assertEquals("https://other.test/", ServerConfig.serverUrl.toString())
    }

    @Test
    fun `reset clears state`() {
        ServerConfig.applyExtras { key ->
            if (key == "YOMIYASU_SERVER_URL") "https://example.test" else null
        }

        ServerConfig.reset()

        assertNull(ServerConfig.serverUrl)
    }
}
