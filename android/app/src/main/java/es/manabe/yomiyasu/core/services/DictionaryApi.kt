package es.manabe.yomiyasu.core.services

import es.manabe.yomiyasu.core.models.DictionaryDisplay
import es.manabe.yomiyasu.core.models.SaveWordResponse
import es.manabe.yomiyasu.core.models.UserWord
import es.manabe.yomiyasu.core.models.UserWordRequest
import es.manabe.yomiyasu.core.models.WordsSort
import es.manabe.yomiyasu.core.networking.ApiClient
import es.manabe.yomiyasu.core.networking.ApiException
import es.manabe.yomiyasu.core.networking.Endpoint
import es.manabe.yomiyasu.core.networking.jsonBody
import kotlinx.serialization.builtins.ListSerializer
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DictionaryApi @Inject constructor(
    private val api: ApiClient,
) {

    suspend fun lookupWord(text: String): List<DictionaryDisplay> {
        val query = text.take(15)
        val data = api.sendBytes(Endpoint.get("api/dictionary/v1/$query"))

        if (data.isEmpty()) return emptyList()

        return try {
            api.json.decodeFromString(
                ListSerializer(DictionaryDisplay.serializer()),
                data.decodeToString(),
            )
        } catch (error: Exception) {
            throw ApiException.Decoding(error)
        }
    }

    suspend fun lookupSentence(text: String): List<DictionaryDisplay> = api.send(
        Endpoint.get("api/dictionary/v2/${text.take(30)}"),
        ListSerializer(DictionaryDisplay.serializer()),
        authorized = false,
    )

    suspend fun saveWord(request: UserWordRequest): Int {
        val response = api.send(
            Endpoint.post("api/userwords", body = jsonBody(request)),
            SaveWordResponse.serializer(),
        )
        return response.modifiedCount
    }

    suspend fun words(sort: WordsSort): List<UserWord> {
        val query = sort.queryValue?.let { listOf("sort" to it) } ?: emptyList()
        return api.send(
            Endpoint.get("api/userwords", query),
            ListSerializer(UserWord.serializer()),
        )
    }

    suspend fun deleteWord(word: String) {
        api.send(Endpoint.delete("api/userwords/$word"))
    }
}
