package es.manabe.yomiyasu.core.services

import android.util.Log
import es.manabe.yomiyasu.app.ServerConfig
import io.socket.client.IO
import io.socket.client.Manager
import io.socket.client.Socket
import io.socket.engineio.client.transports.WebSocket
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONObject
import java.net.URI
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SocketService @Inject constructor() {

    private val _isConnected = MutableStateFlow(false)
    val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()

    private val _libraryUpdatedAt = MutableStateFlow<Long?>(null)
    val libraryUpdatedAt: StateFlow<Long?> = _libraryUpdatedAt.asStateFlow()

    private var manager: Manager? = null
    private var socket: Socket? = null

    var enabled: Boolean = true

    fun start() {
        if (!enabled) return
        if (manager != null) return

        try {
            val serverUrl = ServerConfig.serverUrl
            if (serverUrl == null) {
                Log.w(TAG, "Sin servidor configurado; websocket no iniciado")
                return
            }

            val options = IO.Options().apply {
                path = "/socket.io/"
                transports = arrayOf(WebSocket.NAME)
                reconnection = true
                reconnectionDelay = 2_000
            }

            val uri = URI.create(serverUrl.toString())
            val newManager = Manager(uri, options)
            manager = newManager

            val newSocket = newManager.socket("/ws")
            socket = newSocket

            newSocket.on(Socket.EVENT_CONNECT) {
                _isConnected.value = true
                Log.i(TAG, "Websocket conectado")
            }

            newSocket.on(Socket.EVENT_DISCONNECT) {
                _isConnected.value = false
                Log.i(TAG, "Websocket desconectado")
            }

            newSocket.on("notification") { args ->
                handleNotification(args)
            }

            newSocket.connect()
            Log.i(TAG, "Conectando al websocket $serverUrl")
        } catch (error: Exception) {
            Log.e(TAG, "No se ha podido iniciar el websocket", error)
        }
    }

    fun stop() {
        runCatching { socket?.disconnect() }
        runCatching { socket?.close() }
        socket = null
        manager = null
        _isConnected.value = false
    }

    private fun handleNotification(args: Array<Any>) {
        val payload = args.firstOrNull() ?: return

        val action = when (payload) {
            is JSONObject -> payload.optString("action", "")
            is Map<*, *> -> payload["action"] as? String ?: ""
            is String -> runCatching { JSONObject(payload).optString("action", "") }.getOrDefault("")
            else -> ""
        }

        if (action.isEmpty()) return

        Log.i(TAG, "Notificación recibida: $action")

        if (action == "LIBRARY_UPDATE") {
            markLibraryUpdated()
        }
    }

    /**
     * Provoca la recarga de las vistas que observan ``libraryUpdatedAt``
     * tras una mutación local (marcar leído, leer más tarde, pausar serie…).
     */
    fun markLibraryUpdated() {
        _libraryUpdatedAt.value = System.currentTimeMillis()
    }

    private companion object {
        const val TAG = "SocketService"
    }
}
