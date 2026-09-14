package es.manabe.yomiyasu.core.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AuthUser(
    @SerialName("_id") val id: String,
    val username: String,
    val email: String,
    val admin: Boolean = false,
)

@Serializable
data class LoginRequest(
    val usernameOrEmail: String,
    val password: String,
    val uuid: String,
)

@Serializable
data class LoginResponse(
    val status: String = "",
    val uuid: String = "",
    val user: AuthUser,
    val accessToken: String? = null,
    val refreshToken: String? = null,
)

@Serializable
data class RefreshRequest(val uuid: String)

@Serializable
data class RefreshResponse(
    val status: String = "",
    val uuid: String = "",
    val accessToken: String? = null,
    val refreshToken: String? = null,
)

@Serializable
data class LogoutRequest(val uuid: String)

@Serializable
data class StatusResponse(val status: String = "")
