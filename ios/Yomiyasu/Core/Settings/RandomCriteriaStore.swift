import Foundation

struct RandomCriteria: Codable, Equatable, Sendable {
    var genre: String?
    var author: String?
    var status: SerieStatus?
    var firstLetter: String?
    var minDifficulty: Int?
    var maxDifficulty: Int?
    var readprogress: ProgressFilter?
    var readlistOnly = false

    init(query: SeriesQuery) {
        genre = query.genre
        author = query.author
        status = query.status
        firstLetter = query.firstLetter
        minDifficulty = query.minDifficulty
        maxDifficulty = query.maxDifficulty
        readprogress = query.readprogress
        readlistOnly = query.readlistOnly
    }

    func applying(to query: SeriesQuery) -> SeriesQuery {
        var result = query
        result.genre = genre
        result.author = author
        result.status = status
        result.firstLetter = firstLetter
        result.minDifficulty = minDifficulty
        result.maxDifficulty = maxDifficulty
        result.readprogress = readprogress
        result.readlistOnly = readlistOnly
        return result
    }
}

@MainActor
final class RandomCriteriaStore {
    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    func save(_ criteria: RandomCriteria, variant: LibraryVariant) {
        guard let data = try? JSONEncoder().encode(criteria) else { return }
        defaults.set(data, forKey: Self.key(variant))
    }

    func criteria(variant: LibraryVariant) -> RandomCriteria? {
        guard let data = defaults.data(forKey: Self.key(variant)) else { return nil }
        return try? JSONDecoder().decode(RandomCriteria.self, from: data)
    }

    private static func key(_ variant: LibraryVariant) -> String {
        "randomCriteria.\(variant.rawValue)"
    }
}
