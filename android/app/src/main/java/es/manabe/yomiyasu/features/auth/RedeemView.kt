package es.manabe.yomiyasu.features.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import es.manabe.yomiyasu.core.models.RedeemRequest
import es.manabe.yomiyasu.core.networking.ApiException
import es.manabe.yomiyasu.core.services.AccountApi
import es.manabe.yomiyasu.core.session.SessionStore
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class RedeemViewModel @Inject constructor(
    private val accountApi: AccountApi,
    private val session: SessionStore,
) : ViewModel() {

    var code by mutableStateOf("")
    var username by mutableStateOf("")
    var email by mutableStateOf("")
    var password by mutableStateOf("")
    var isSubmitting by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    val isValid: Boolean
        get() = code.isNotBlank() && username.isNotBlank() && email.contains("@") && password.length >= 6

    fun redeem() {
        if (isSubmitting) return

        viewModelScope.launch {
            isSubmitting = true
            errorMessage = null
            try {
                accountApi.redeem(
                    RedeemRequest(
                        code = code.trim(),
                        username = username.trim(),
                        email = email.trim(),
                        password = password,
                    ),
                )
                session.login(username.trim(), password)
            } catch (error: ApiException) {
                errorMessage = error.userMessage
            } catch (error: Exception) {
                errorMessage = "No se ha podido crear la cuenta."
            } finally {
                isSubmitting = false
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RedeemView(
    onBack: () -> Unit,
    viewModel: RedeemViewModel = hiltViewModel(),
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Canjear código") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
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
                .padding(24.dp)
                .testTag("redeemScreen"),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Column(
                modifier = Modifier.widthIn(max = 400.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                OutlinedTextField(
                    value = viewModel.code,
                    onValueChange = { viewModel.code = it },
                    label = { Text("Código de invitación") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = viewModel.username,
                    onValueChange = { viewModel.username = it },
                    label = { Text("Usuario") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = viewModel.email,
                    onValueChange = { viewModel.email = it },
                    label = { Text("Correo") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = viewModel.password,
                    onValueChange = { viewModel.password = it },
                    label = { Text("Contraseña") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth(),
                )

                Text(
                    text = "Necesitas un código de invitación para crear una cuenta.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                viewModel.errorMessage?.let { error ->
                    Text(text = error, color = MaterialTheme.colorScheme.error)
                }

                Button(
                    onClick = { viewModel.redeem() },
                    enabled = viewModel.isValid && !viewModel.isSubmitting,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    if (viewModel.isSubmitting) {
                        CircularProgressIndicator(modifier = Modifier.padding(vertical = 2.dp))
                    } else {
                        Text("Crear cuenta")
                    }
                }
            }
        }
    }
}
