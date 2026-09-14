package es.manabe.yomiyasu.core.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class RedeemRequest(
    val code: String,
    val username: String,
    val email: String,
    val password: String,
)

@Serializable
data class RedeemResponse(
    @SerialName("_id") val id: String,
    val username: String,
    val email: String,
    val admin: Boolean? = null,
)

@Serializable
data class UpdateUserRequest(
    val newUsername: String? = null,
    val oldPassword: String? = null,
    val newPassword: String? = null,
)
