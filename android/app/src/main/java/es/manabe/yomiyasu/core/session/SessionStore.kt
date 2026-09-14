package es.manabe.yomiyasu.core.session

import es.manabe.yomiyasu.app.DebugConfig
import es.manabe.yomiyasu.core.models.AuthUser
import es.manabe.yomiyasu.core.models.LoginRequest
import es.manabe.yomiyasu.core.models.LoginResponse
import es.manabe.yomiyasu.core.models.LogoutRequest
import es.manabe.yomiyasu.core.models.RefreshRequest
import es.manabe.yomiyasu.core.models.RefreshResponse
import es.manabe.yomiyasu.core.models.StatusResponse
import es.manabe.yomiyasu.core.networking.ApiClient
import es.manabe.yomiyasu.core.networking.ApiException
import es.manabe.yomiyasu.core.networking.Endpoint
import es.manabe.yomiyasu.core.networking.jsonBody
import es.manabe.yomiyasu.core.services.SocketService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SessionStore @Inject constructor(
    private val api: ApiClient,
    private val tokenStore: TokenStore,
    private val socket: SocketService,
) : ApiClient.AuthTokenProvider {

    sealed interface State {
        data object Loading : State
        data object LoggedOut : State
        data class LoggedIn(val user: AuthUser) : State
    }

    private val _state = MutableStateFlow<State>(State.Loading)
    val state: StateFlow<State> = _state.asStateFlow()

    private val _notice = MutableStateFlow<String?>(null)
    val notice: StateFlow<String?> = _notice.asStateFlow()

    var uuid: String = ""
        private set

    override var accessToken: String? = null
        private set

    private var refreshToken: String? = null
    private val bootstrapMutex = Mutex()
    private val refreshMutex = Mutex()
    private var bootstrapped = false

    private object Key {
        const val AccessToken = "accessToken"
        const val RefreshToken = "refreshToken"
        const val Uuid = "uuid"
    }

    init {
        api.authProvider = this
    }

    suspend fun bootstrap() {
        bootstrapMutex.withLock {
            if (bootstrapped) return@withLock
            bootstrapped = true

            uuid = tokenStore.getString(Key.Uuid) ?: UUID.randomUUID().toString().lowercase()
                .also { tokenStore.setString(Key.Uuid, it) }

            accessToken = tokenStore.getString(Key.AccessToken)
            refreshToken = tokenStore.getString(Key.RefreshToken)

            if (refreshToken == null) {
                updateState(State.LoggedOut)
            } else {
                try {
                    val user = api.send(Endpoint.get("api/auth/me"), AuthUser.serializer())
                    updateState(State.LoggedIn(user))
                } catch (error: ApiException) {
                    clearSession(SESSION_EXPIRED_MESSAGE)
                }
            }
        }

        autoLoginIfRequested()
    }

    private suspend fun autoLoginIfRequested() {
        if (_state.value is State.LoggedIn) return
        val user = DebugConfig.autoLoginUser ?: return
        val password = DebugConfig.autoLoginPassword ?: return
        runCatching { login(user, password) }
            .onFailure { error ->
                android.util.Log.w("SessionStore", "Auto-login fallido: ${error.message}")
            }
    }

    suspend fun login(usernameOrEmail: String, password: String) {
        _notice.value = null

        val endpoint = Endpoint.post(
            "api/auth/login",
            body = jsonBody(LoginRequest(usernameOrEmail, password, uuid)),
            headers = mapOf("X-Token-Transport" to "body"),
        )

        val response = api.send(
            endpoint,
            LoginResponse.serializer(),
            authorized = false,
        )

        val newAccess = response.accessToken
        val newRefresh = response.refreshToken
        if (newAccess == null || newRefresh == null) {
            throw ApiException.UnexpectedResponse()
        }

        persist(newAccess, newRefresh)
        updateState(State.LoggedIn(response.user))
    }

    override suspend fun refreshTokens() {
        refreshMutex.withLock {
            val currentRefresh = refreshToken
            if (currentRefresh == null) {
                clearSession(SESSION_EXPIRED_MESSAGE)
                throw ApiException.SessionExpired()
            }

            try {
                val endpoint = Endpoint.post(
                    "api/auth/refresh",
                    body = jsonBody(RefreshRequest(uuid)),
                    headers = mapOf(
                        "X-Token-Transport" to "body",
                        "Authorization" to "Bearer $currentRefresh",
                    ),
                )

                val response = api.send(
                    endpoint,
                    RefreshResponse.serializer(),
                    authorized = false,
                )

                val newAccess = response.accessToken
                val newRefresh = response.refreshToken
                if (newAccess == null || newRefresh == null) {
                    clearSession(SESSION_EXPIRED_MESSAGE)
                    throw ApiException.SessionExpired()
                }

                persist(newAccess, newRefresh)
            } catch (error: ApiException) {
                if (error is ApiException.Http && (error.status == 401 || error.status == 403)) {
                    clearSession(SESSION_EXPIRED_MESSAGE)
                    throw ApiException.SessionExpired()
                }
                throw error
            }
        }
    }

    suspend fun logout(notice: String? = null) {
        runCatching {
            api.send(
                Endpoint.post("api/auth/logout", body = jsonBody(LogoutRequest(uuid))),
                StatusResponse.serializer(),
            )
        }
        clearSession(notice)
    }

    fun updateUsername(username: String) {
        val current = _state.value
        if (current is State.LoggedIn) {
            updateState(State.LoggedIn(current.user.copy(username = username)))
        }
    }

    fun consumeNotice() {
        _notice.value = null
    }

    private fun updateState(newState: State) {
        _state.value = newState

        when (newState) {
            is State.LoggedIn -> socket.start()
            State.LoggedOut -> socket.stop()
            State.Loading -> Unit
        }
    }

    private fun persist(newAccessToken: String, newRefreshToken: String) {
        accessToken = newAccessToken
        refreshToken = newRefreshToken
        tokenStore.setString(Key.AccessToken, newAccessToken)
        tokenStore.setString(Key.RefreshToken, newRefreshToken)
    }

    private fun clearSession(notice: String? = null) {
        accessToken = null
        refreshToken = null
        tokenStore.remove(Key.AccessToken)
        tokenStore.remove(Key.RefreshToken)
        _notice.value = notice
        updateState(State.LoggedOut)
    }

    companion object {
        const val SESSION_EXPIRED_MESSAGE = "La sesión ha caducado. Vuelve a iniciar sesión."
    }
}
