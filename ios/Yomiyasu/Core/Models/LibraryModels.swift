import Foundation

enum Variant: String, Codable, Sendable, CaseIterable {
    case manga
    case novela

    var title: String {
        switch self {
        case .manga: "Manga"
        case .novela: "Novela"
        }
    }

    var staticFolder: String {
        switch self {
        case .manga: "mangas"
        case .novela: "novelas"
        }
    }
}

enum LibraryVariant: String, Sendable, CaseIterable, Identifiable {
    case manga
    case novela
    case all

    var id: String { rawValue }

    var title: String {
        switch self {
        case .manga: "Mangas"
        case .novela: "Novelas"
        case .all: "Todo"
        }
    }
}

enum MainView: String, Codable, Sendable, CaseIterable, Identifiable {
    case manga
    case novels
    case both

    var id: String { rawValue }

    var title: String {
        switch self {
        case .manga: "Solo manga"
        case .novels: "Solo novelas"
        case .both: "Manga y novelas"
        }
    }
}

enum SerieStatus: String, Codable, Sendable, CaseIterable, Identifiable {
    case publishing = "PUBLISHING"
    case ended = "ENDED"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .publishing: "En publicación"
        case .ended: "Finalizada"
        }
    }
}

enum ProgressStatus: String, Codable, Sendable {
    case unread
    case reading
    case completed

    var title: String {
        switch self {
        case .unread: "Sin leer"
        case .reading: "Leyendo"
        case .completed: "Leído"
        }
    }
}

enum ProgressFilter: String, Codable, Sendable, CaseIterable, Identifiable {
    case all
    case unread
    case reading
    case completed

    var id: String { rawValue }

    var title: String {
        switch self {
        case .all: "Todos"
        case .unread: "Sin leer"
        case .reading: "Leyendo"
        case .completed: "Leídos"
        }
    }
}

struct SortValue: Sendable, Equatable, Hashable {
    var key: String
    var descending: Bool

    var rawValue: String {
        descending ? "!\(key)" : key
    }

    static let seriesDefault = SortValue(key: "sortName", descending: false)
    static let seriesNewest = SortValue(key: "_id", descending: true)
    static let seriesRecent = SortValue(key: "lastModifiedDate", descending: true)
    static let seriesValoration = SortValue(key: "valoration", descending: true)
    static let booksDefault = SortValue(key: "sortName", descending: false)
    static let booksNewest = SortValue(key: "_id", descending: true)
}

struct ReadlistEntry: Codable, Sendable, Equatable {
    let id: String?
    let serie: String?
    let addedDate: Date?

    private enum CodingKeys: String, CodingKey {
        case id = "_id"
        case serie
        case addedDate
    }
}

struct ReadlistValue: Decodable, Sendable, Equatable {
    let isInReadlist: Bool

    init(isInReadlist: Bool) {
        self.isInReadlist = isInReadlist
    }

    init(from decoder: any Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let value = try? container.decode(Bool.self) {
            isInReadlist = value
        } else if let entry = try? container.decode(ReadlistEntry.self) {
            isInReadlist = entry.id != nil
        } else {
            isInReadlist = false
        }
    }
}

enum CurrentBook: Decodable, Sendable, Equatable {
    case id(String)
    case book(Book)

    init(from decoder: any Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let id = try? container.decode(String.self) {
            self = .id(id)
            return
        }

        self = .book(try container.decode(Book.self))
    }

    var id: String {
        switch self {
        case .id(let id): id
        case .book(let book): book.id
        }
    }
}

struct Review: Codable, Identifiable, Sendable, Equatable {
    let id: String
    let user: String?
    let serie: String?
    let userLevel: String?
    let difficulty: Int?
    let valoration: Int?
    let comment: String?
    let name: String?

    private enum CodingKeys: String, CodingKey {
        case id = "_id"
        case user
        case serie
        case userLevel
        case difficulty
        case valoration
        case comment
        case name
    }
}

struct Serie: Decodable, Identifiable, Sendable, Equatable {
    let id: String
    let path: String?
    let variant: Variant?
    let visibleName: String
    let sortName: String?
    let bookCount: Int?
    let difficulty: Double?
    let createdDate: Date?
    let lastModifiedDate: Date?
    let status: SerieStatus?
    let summary: String?
    let authors: [String]?
    let genres: [String]?
    let missing: Bool?
    let valoration: Double?
    let alternativeNames: [String]?

    let unreadBooks: Int?
    let paused: Bool?
    let readlist: ReadlistValue?
    let thumbnailPath: String?
    let currentBook: CurrentBook?
    let reviews: [Review]?

    private enum CodingKeys: String, CodingKey {
        case id = "_id"
        case path
        case variant
        case visibleName
        case sortName
        case bookCount
        case difficulty
        case createdDate
        case lastModifiedDate
        case status
        case summary
        case authors
        case genres
        case missing
        case valoration
        case alternativeNames
        case unreadBooks
        case paused
        case readlist
        case thumbnailPath
        case currentBook
        case reviews
    }
}

extension Serie {
    var isInReadlist: Bool { readlist?.isInReadlist ?? false }
    var unreadCount: Int { unreadBooks ?? 0 }
    var totalBooks: Int { bookCount ?? 0 }
    var isPaused: Bool { paused ?? false }
    var displayGenres: [String] { genres ?? [] }
    var displayAuthors: [String] { authors ?? [] }
    var progressFraction: Double {
        guard totalBooks > 0 else { return 0 }
        return Double(totalBooks - unreadCount) / Double(totalBooks)
    }
    var plainSummary: String {
        (summary ?? "")
            .replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

/// Formato del tomo: mokuro (html con OCR) o carpeta de imágenes sin html.
/// El backend no manda el campo en libros antiguos: ausente = mokuro.
enum BookFormat: String, Decodable, Sendable {
    case mokuro
    case images
}

struct Book: Decodable, Identifiable, Sendable, Equatable {
    let id: String
    let path: String?
    let serie: String?
    let seriePath: String?
    let pages: Int?
    let visibleName: String
    let sortName: String?
    let imagesFolder: String?
    let thumbnailPath: String?
    let createdDate: Date?
    let releaseDate: Date?
    let lastModifiedDate: Date?
    let missing: Bool?
    let characters: Int?
    let pageChars: [Int]?
    let variant: Variant?
    let mokured: Bool?
    let format: BookFormat?
    /// Nombres de las imágenes del tomo (solo tomos "images").
    let pagePaths: [String]?

    let status: ProgressStatus?
    let lastProgress: ReadProgress?
    let readlist: ReadlistValue?
    let type: String?

    private enum CodingKeys: String, CodingKey {
        case id = "_id"
        case path
        case serie
        case seriePath
        case pages
        case visibleName
        case sortName
        case imagesFolder
        case thumbnailPath
        case createdDate
        case releaseDate
        case lastModifiedDate
        case missing
        case characters
        case pageChars
        case variant
        case mokured
        case format
        case pagePaths
        case status
        case lastProgress
        case readlist
        case type
    }
}

extension Book {
    var resolvedStatus: ProgressStatus { status ?? .unread }
    var isMokured: Bool { mokured ?? false }
    var isImageFolder: Bool { format == .images }
    var progressFraction: Double {
        guard let pages, pages > 0, let currentPage = lastProgress?.currentPage else {
            if let characters, characters > 0, let readCharacters = lastProgress?.characters {
                return min(1, Double(readCharacters) / Double(characters))
            }
            return 0
        }
        return min(1, Double(currentPage) / Double(pages))
    }
}

struct ReadProgress: Codable, Identifiable, Sendable, Equatable {
    let id: String?
    let book: String?
    let serie: String?
    let startDate: Date?
    let lastUpdateDate: Date?
    let endDate: Date?
    let time: Int?
    let currentPage: Int?
    let status: ProgressStatus?
    let paused: Bool?
    let characters: Int?
    let variant: Variant?

    private enum CodingKeys: String, CodingKey {
        case id = "_id"
        case book
        case serie
        case startDate
        case lastUpdateDate
        case endDate
        case time
        case currentPage
        case status
        case paused
        case characters
        case variant
    }
}

struct SeriesPage: Decodable, Sendable {
    let data: [Serie]
    let pages: Int
}

struct AlphabetGroup: Decodable, Sendable, Identifiable, Equatable {
    let group: String
    let count: Int

    var id: String { group }

    var displayName: String {
        switch group {
        case "all": "Todo"
        case "#": "#"
        default: group.uppercased()
        }
    }
}

struct GenresAndArtists: Decodable, Sendable, Equatable {
    let genres: [String]
    let authors: [String]
}

struct ReadlistRequest: Encodable, Sendable {
    let serie: String
}

struct EmptyResponse: Decodable, Sendable {
    init(from decoder: any Decoder) throws {}
}
