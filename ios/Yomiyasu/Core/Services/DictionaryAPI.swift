import Foundation

@MainActor
struct DictionaryAPI {
    let client: APIClient

    func lookupWord(_ text: String) async throws -> [DictionaryDisplay] {
        let query = String(text.prefix(15))
        let data = try await client.sendData(.get("api/dictionary/v1/\(query)"))

        guard !data.isEmpty else { return [] }

        return try JSONDecoder.yomiyasu().decode([DictionaryDisplay].self, from: data)
    }

    func lookupSentence(_ text: String) async throws -> [DictionaryDisplay] {
        try await client.send(.get("api/dictionary/v2/\(String(text.prefix(30)))"))
    }

    func saveWord(_ request: UserWordRequest) async throws -> Int {
        let endpoint = try Endpoint.post("api/userwords", json: request)
        let response: SaveWordResponse = try await client.send(endpoint)
        return response.modifiedCount
    }

    func words(sort: WordsSort) async throws -> [UserWord] {
        var queryItems: [URLQueryItem] = []

        if let value = sort.queryValue {
            queryItems.append(URLQueryItem(name: "sort", value: value))
        }

        return try await client.send(.get("api/userwords", queryItems: queryItems))
    }

    func deleteWord(_ word: String) async throws {
        try await client.send(Endpoint(method: .delete, path: "api/userwords/\(word)"))
    }
}

struct SaveWordResponse: Decodable, Sendable {
    let modifiedCount: Int
}
