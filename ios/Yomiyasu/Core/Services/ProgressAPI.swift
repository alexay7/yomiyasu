import Foundation

struct ReadProgressRequest: Encodable, Sendable {
    let book: String
    let time: Int?
    let currentPage: Int
    let characters: Int
    let status: String
    var endDate: String? = nil
}

@MainActor
struct ProgressAPI {
    let client: APIClient

    func progress(forBook bookId: String) async throws -> ReadProgress? {
        let progress: ReadProgress = try await client.send(
            .get("api/readprogress", queryItems: [URLQueryItem(name: "book", value: bookId)])
        )
        return progress.id == nil ? nil : progress
    }

    func save(_ request: ReadProgressRequest) async throws {
        try await client.send(try Endpoint.post("api/readprogress", json: request))
    }

    func markCompleted(_ book: Book, currentPage: Int? = nil, characters: Int? = nil) async throws {
        let request = ReadProgressRequest(
            book: book.id,
            time: nil,
            currentPage: currentPage ?? book.pages ?? 0,
            characters: characters ?? book.characters ?? 0,
            status: "completed",
            endDate: ISO8601DateFormatter().string(from: .now)
        )
        try await save(request)
    }

    func markUnread(_ book: Book) async throws {
        let request = ReadProgressRequest(
            book: book.id,
            time: nil,
            currentPage: 0,
            characters: 0,
            status: "unread"
        )
        try await save(request)
    }

    func neighboringBook(of bookId: String, forward: Bool) async throws -> Book? {
        let action = forward ? "next" : "prev"
        let data = try await client.sendData(.get("api/books/\(bookId)/\(action)"))

        struct Probe: Decodable { let _id: String }

        let decoder = JSONDecoder.yomiyasu()

        if let probe = try? decoder.decode(Probe.self, from: data),
           probe._id == "end" || probe._id == "start" {
            return nil
        }

        return try decoder.decode(Book.self, from: data)
    }

    func stats() async throws -> UserStats {
        try await client.send(.get("api/readprogress/mystats"))
    }

    func graphs() async throws -> MonthlyGraphs {
        try await client.send(.get("api/readprogress/mygraphs"))
    }

    func streak(year: Int, month: Int) async throws -> [StreakDay] {
        // El endpoint usa meses base 0 (`new Date(year, month)` en el backend),
        // a diferencia de `logs/:year/:month/:day`, que usa base 1 ($month de Mongo).
        try await client.send(.get("api/readprogress/streak/\(year)/\(month - 1)"))
    }

    func logs(year: Int, month: Int, day: Int) async throws -> [ProgressRecord] {
        try await client.send(.get("api/readprogress/logs/\(year)/\(month)/\(day)"))
    }

    func all(page: Int, limit: Int, sort: String) async throws -> (records: [ProgressRecord], total: Int) {
        struct Page: Decodable {
            let data: [ProgressRecord]
            let total: Int
        }

        do {
            let response: Page = try await client.send(
                .get(
                    "api/readprogress/all",
                    queryItems: [
                        URLQueryItem(name: "page", value: String(page)),
                        URLQueryItem(name: "limit", value: String(limit)),
                        URLQueryItem(name: "sort", value: sort),
                    ]
                )
            )
            return (response.data, response.total)
        } catch let error as APIError {
            if case .http(let status, _) = error, status == 400 {
                return ([], 0)
            }
            throw error
        }
    }

    func speed(serieId: String) async throws -> [ProgressRecord] {
        try await client.send(.get("api/readprogress/serie/\(serieId)/speed"))
    }
}
