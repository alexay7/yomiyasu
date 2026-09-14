package es.manabe.yomiyasu.app

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import es.manabe.yomiyasu.R
import es.manabe.yomiyasu.app.ui.theme.YomiyasuTheme
import es.manabe.yomiyasu.core.session.SessionStore
import es.manabe.yomiyasu.features.auth.LoginView
import es.manabe.yomiyasu.features.auth.RedeemView

@Composable
fun AppRoot(viewModel: AppViewModel = hiltViewModel()) {
    val settings by viewModel.settingsData.collectAsStateWithLifecycle()
    val sessionState by viewModel.sessionState.collectAsStateWithLifecycle()
    val notice by viewModel.notice.collectAsStateWithLifecycle()

    YomiyasuTheme(themeMode = settings.appearance) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background,
        ) {
            when (val state = sessionState) {
                SessionStore.State.Loading -> LoadingScreen()

                SessionStore.State.LoggedOut -> {
                    var showRedeem by rememberSaveable { mutableStateOf(false) }

                    if (showRedeem) {
                        RedeemView(onBack = { showRedeem = false })
                    } else {
                        LoginView(
                            notice = notice,
                            onOpenRedeem = { showRedeem = true },
                        )
                    }
                }

                is SessionStore.State.LoggedIn -> MainShell(
                    mainView = settings.mainView,
                    isSocketConnected = viewModel.isSocketConnected.collectAsStateWithLifecycle().value,
                    onMarkLibraryUpdated = viewModel::markLibraryUpdated,
                    onLogout = viewModel::logout,
                )
            }
        }
    }
}

@Composable
private fun LoadingScreen() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Image(
            painter = painterResource(R.mipmap.ic_launcher_foreground),
            contentDescription = null,
            modifier = Modifier.size(120.dp),
        )
        Text(
            text = "Yomiyasu",
            style = MaterialTheme.typography.headlineMedium,
        )
        CircularProgressIndicator(modifier = Modifier.size(32.dp).padding(top = 8.dp))
    }
}
