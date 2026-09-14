package es.manabe.yomiyasu.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import es.manabe.yomiyasu.core.services.SocketService
import es.manabe.yomiyasu.core.session.SessionStore
import es.manabe.yomiyasu.core.settings.AppSettings
import es.manabe.yomiyasu.core.settings.AppSettingsData
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AppViewModel @Inject constructor(
    private val session: SessionStore,
    settings: AppSettings,
    private val socket: SocketService,
) : ViewModel() {

    val sessionState: StateFlow<SessionStore.State> = session.state
    val notice: StateFlow<String?> = session.notice

    val settingsData: StateFlow<AppSettingsData> = settings.flow
    val isSocketConnected: StateFlow<Boolean> = socket.isConnected

    fun consumeNotice() {
        session.consumeNotice()
    }

    fun login(username: String, password: String) {
        viewModelScope.launch {
            runCatching { session.login(username, password) }
        }
    }

    fun logout() {
        viewModelScope.launch { session.logout() }
    }

    fun markLibraryUpdated() {
        socket.markLibraryUpdated()
    }
}
