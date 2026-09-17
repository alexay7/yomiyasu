package es.manabe.yomiyasu.features.settings

import androidx.activity.compose.LocalOnBackPressedDispatcherOwner
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import es.manabe.yomiyasu.core.models.UpdateUserRequest
import es.manabe.yomiyasu.core.networking.ApiException
import es.manabe.yomiyasu.core.services.AccountApi
import es.manabe.yomiyasu.core.session.SessionStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AccountViewModel @Inject constructor(
    private val accountApi: AccountApi,
    private val session: SessionStore,
) : ViewModel() {

    data class UiState(
        val newUsername: String = "",
        val oldPassword: String = "",
        val newPassword: String = "",
        val confirmPassword: String = "",
        val isSavingUsername: Boolean = false,
        val isSavingPassword: Boolean = false,
        val message: String? = null,
        val errorMessage: String? = null,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    val username: StateFlow<String> = session.state
        .map { current -> (current as? SessionStore.State.LoggedIn)?.user?.username ?: "—" }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), "—")

    fun updateNewUsername(value: String) {
        _state.update { it.copy(newUsername = value, message = null, errorMessage = null) }
    }

    fun updateOldPassword(value: String) {
        _state.update { it.copy(oldPassword = value, message = null, errorMessage = null) }
    }

    fun updateNewPassword(value: String) {
        _state.update { it.copy(newPassword = value, message = null, errorMessage = null) }
    }

    fun updateConfirmPassword(value: String) {
        _state.update { it.copy(confirmPassword = value, message = null, errorMessage = null) }
    }

    fun changeUsername() {
        val current = _state.value
        val username = current.newUsername.trim()
        if (current.isSavingUsername || username.isEmpty()) return

        viewModelScope.launch {
            _state.update { it.copy(isSavingUsername = true, message = null, errorMessage = null) }

            try {
                accountApi.updateUser(UpdateUserRequest(newUsername = username))
                session.updateUsername(username)
                _state.update {
                    it.copy(
                        isSavingUsername = false,
                        newUsername = "",
                        message = "Usuario actualizado.",
                    )
                }
            } catch (error: ApiException) {
                _state.update {
                    it.copy(isSavingUsername = false, errorMessage = error.userMessage)
                }
            } catch (error: Exception) {
                _state.update {
                    it.copy(
                        isSavingUsername = false,
                        errorMessage = "No se ha podido actualizar el usuario.",
                    )
                }
            }
        }
    }

    fun changePassword(onLoggedOut: () -> Unit) {
        val current = _state.value
        if (current.isSavingPassword || current.oldPassword.isEmpty() || current.newPassword.length < 6) {
            return
        }

        if (current.newPassword != current.confirmPassword) {
            _state.update {
                it.copy(message = null, errorMessage = "Las contraseñas no coinciden.")
            }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isSavingPassword = true, message = null, errorMessage = null) }

            try {
                accountApi.updateUser(
                    UpdateUserRequest(
                        oldPassword = current.oldPassword,
                        newPassword = current.newPassword,
                    ),
                )

                session.logout(notice = PASSWORD_CHANGED_MESSAGE)
                onLoggedOut()
            } catch (error: ApiException) {
                _state.update {
                    it.copy(isSavingPassword = false, errorMessage = error.userMessage)
                }
            } catch (error: Exception) {
                _state.update {
                    it.copy(
                        isSavingPassword = false,
                        errorMessage = "No se ha podido cambiar la contraseña.",
                    )
                }
            }
        }
    }

    companion object {
        const val PASSWORD_CHANGED_MESSAGE = "La contraseña ha cambiado. Vuelve a iniciar sesión."
    }
}

@Composable
fun AccountRoute(
    onLogout: () -> Unit,
    onBack: (() -> Unit)? = null,
    viewModel: AccountViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val username by viewModel.username.collectAsStateWithLifecycle()

    val backDispatcher = LocalOnBackPressedDispatcherOwner.current?.onBackPressedDispatcher
    val backAction: (() -> Unit)? = onBack ?: backDispatcher?.let { dispatcher ->
        { dispatcher.onBackPressed() }
    }

    AccountScreen(
        onBack = backAction,
        currentUsername = username,
        state = state,
        onNewUsernameChange = viewModel::updateNewUsername,
        onOldPasswordChange = viewModel::updateOldPassword,
        onNewPasswordChange = viewModel::updateNewPassword,
        onConfirmPasswordChange = viewModel::updateConfirmPassword,
        onChangeUsername = viewModel::changeUsername,
        onChangePassword = { viewModel.changePassword(onLogout) },
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AccountScreen(
    onBack: (() -> Unit)?,
    currentUsername: String,
    state: AccountViewModel.UiState,
    onNewUsernameChange: (String) -> Unit,
    onOldPasswordChange: (String) -> Unit,
    onNewPasswordChange: (String) -> Unit,
    onConfirmPasswordChange: (String) -> Unit,
    onChangeUsername: () -> Unit,
    onChangePassword: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Cuenta") },
                navigationIcon = {
                    if (onBack != null) {
                        IconButton(onClick = onBack) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Volver",
                            )
                        }
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .imePadding()
                .padding(16.dp)
                .testTag("accountForm"),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Usuario",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary,
            )

            Row(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "Usuario actual",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = currentUsername,
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.End,
                    modifier = Modifier.weight(1f),
                )
            }

            OutlinedTextField(
                value = state.newUsername,
                onValueChange = onNewUsernameChange,
                label = { Text("Nuevo nombre de usuario") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    capitalization = KeyboardCapitalization.None,
                    autoCorrectEnabled = false,
                    keyboardType = KeyboardType.Text,
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            Button(
                onClick = onChangeUsername,
                enabled = !state.isSavingUsername && state.newUsername.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (state.isSavingUsername) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = LocalContentColor.current,
                    )
                } else {
                    Text("Cambiar usuario")
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Contraseña",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary,
            )

            OutlinedTextField(
                value = state.oldPassword,
                onValueChange = onOldPasswordChange,
                label = { Text("Contraseña actual") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
            )

            OutlinedTextField(
                value = state.newPassword,
                onValueChange = onNewPasswordChange,
                label = { Text("Nueva contraseña") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
            )

            OutlinedTextField(
                value = state.confirmPassword,
                onValueChange = onConfirmPasswordChange,
                label = { Text("Repetir nueva contraseña") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
            )

            Text(
                text = "Al cambiar la contraseña se cerrará la sesión en todos los dispositivos.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Button(
                onClick = onChangePassword,
                enabled = !state.isSavingPassword &&
                    state.oldPassword.isNotEmpty() &&
                    state.newPassword.length >= 6,
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (state.isSavingPassword) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = LocalContentColor.current,
                    )
                } else {
                    Text("Cambiar contraseña")
                }
            }

            state.message?.let { message ->
                Text(
                    text = message,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.primary,
                )
            }

            state.errorMessage?.let { error ->
                Text(
                    text = error,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.error,
                )
            }
        }
    }
}
