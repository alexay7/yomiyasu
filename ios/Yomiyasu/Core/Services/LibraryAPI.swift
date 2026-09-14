import Foundation

@MainActor
struct LibraryAPI {
    let client: APIClient

    func seriesPage(_ query: SeriesQuery) async throws -> SeriesPage {
        try await client.send(
            .get("api/series/\(query.variant.rawValue)", queryItems: query.queryItems)
        )
    }

    func seriesList(_ query: SeriesQuery) async throws -> [Serie] {
        try await seriesPage(query).data
    }

    func randomSerie(_ query: SeriesQuery) async throws -> Serie {
        try await client.send(
            .get("api/series/\(query.variant.rawValue)/random", queryItems: query.randomQueryItems)
        )
    }

    func alphabet(_ query: SeriesQuery) async throws -> [AlphabetGroup] {
        try await client.send(
            .get("api/series/\(query.variant.rawValue)/alphabet", queryItems: query.alphabetQueryItems)
        )
    }

    func genresAndArtists() async throws -> GenresAndArtists {
        try await client.send(.get("api/series/genresAndArtists"))
    }

    func serieDetail(id: String) async throws -> Serie {
        try await client.send(.get("api/series/serie/\(id)"))
    }

    func books(_ query: BooksQuery) async throws -> [Book] {
        try await client.send(
            .get("api/books/\(query.variant.rawValue)", queryItems: query.queryItems)
        )
    }

    func book(id: String) async throws -> Book {
        try await client.send(.get("api/books/book/\(id)"))
    }

    func reading() async throws -> [Book] {
        try await client.send(.get("api/readprogress/reading"))
    }

    func tablero() async throws -> [Book] {
        try await client.send(.get("api/readprogress/tablero"))
    }

    func readlist(variant: LibraryVariant) async throws -> [Serie] {
        try await client.send(.get("api/series/\(variant.rawValue)/readlist"))
    }

    func addToReadlist(serieId: String) async throws {
        let endpoint = try Endpoint.post("api/readlists", json: ReadlistRequest(serie: serieId))
        let _: ReadlistEntry = try await client.send(endpoint)
    }

    func removeFromReadlist(serieId: String) async throws {
        let endpoint = try Endpoint.post("api/readlists/delete", json: ReadlistRequest(serie: serieId))
        try await client.send(endpoint)
    }

    func markSerieRead(serieId: String) async throws {
        try await client.send(.post("api/readprogress/\(serieId)"))
    }

    func setSeriePaused(_ paused: Bool, serieId: String) async throws {
        let action = paused ? "pause" : "resume"
        try await client.send(.post("api/serieprogress/\(action)/\(serieId)"))
    }

    func createReview(_ request: CreateReviewRequest) async throws -> Review {
        try await client.send(try Endpoint.post("api/reviews", json: request))
    }

    func deleteReview(id: String) async throws {
        try await client.send(Endpoint(method: .delete, path: "api/reviews/\(id)"))
    }
}
