package es.manabe.yomiyasu.core.services

import es.manabe.yomiyasu.core.models.RedeemRequest
import es.manabe.yomiyasu.core.models.RedeemResponse
import es.manabe.yomiyasu.core.models.UpdateUserRequest
import es.manabe.yomiyasu.core.networking.ApiClient
import es.manabe.yomiyasu.core.networking.Endpoint
import es.manabe.yomiyasu.core.networking.jsonBody
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AccountApi @Inject constructor(
    private val api: ApiClient,
) {

    suspend fun redeem(request: RedeemRequest): RedeemResponse = api.send(
        Endpoint.post("api/invis/redeem", body = jsonBody(request)),
        RedeemResponse.serializer(),
        authorized = false,
    )

    suspend fun updateUser(request: UpdateUserRequest) {
        api.send(Endpoint.patch("api/users/update", body = jsonBody(request)))
    }
}
