import Foundation

struct UserStats: Decodable, Sendable {
    let totalMangaBooks: Int
    let totalNovelaBooks: Int
    let totalPagesRead: Int
    let totalCharacters: Int
    let totalMangaSeries: Int
    let totalNovelaSeries: Int
    let totalTimeRead: Double
}

struct MonthlyGraphEntry: Decodable, Sendable, Identifiable {
    struct MonthID: Decodable, Sendable, Hashable {
        let year: Int
        let month: Int
    }

    let monthID: MonthID
    let totalCharacters: Int
    let totalTime: Int
    let meanReadSpeed: Double
    let totalHours: Double

    var id: String { "\(monthID.year)-\(monthID.month)" }

    private enum CodingKeys: String, CodingKey {
        case monthID = "_id"
        case totalCharacters
        case totalTime
        case meanReadSpeed
        case totalHours
    }
}

struct MonthlyGraphs: Decodable, Sendable {
    let manga: [MonthlyGraphEntry]
    let novela: [MonthlyGraphEntry]
}

struct StreakDay: Decodable, Sendable, Identifiable {
    let dayOfMonth: Int
    let count: Int

    var id: Int { dayOfMonth }
}

struct ProgressRecord: Decodable, Sendable, Identifiable {
    let id: String
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
    let day: Int?
    let month: Int?
    let year: Int?
    let bookInfo: Book?
    let serieInfo: Serie?
    let meanReadSpeed: Double?

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
        case day
        case month
        case year
        case bookInfo
        case serieInfo
        case meanReadSpeed
    }
}

extension ProgressRecord {
    var bookName: String { bookInfo?.visibleName ?? "—" }
    var serieName: String { serieInfo?.visibleName ?? "" }
    var resolvedVariant: Variant { variant ?? bookInfo?.variant ?? .manga }

    var logLine: String {
        var text: String

        switch resolvedVariant {
        case .manga:
            text = ".log manga \(currentPage ?? 1) \(bookName)"
        case .novela:
            text = ".log lectura \(characters ?? 0) \(bookName)"
        }

        if let time, time > 59 {
            text += ";\(time / 60)"
        }

        if resolvedVariant == .manga, let characters, characters > 0 {
            text += "&\(characters)"
        }

        return text
    }
}

struct CreateReviewRequest: Encodable, Sendable {
    let serie: String
    let userLevel: String
    let difficulty: Int
    let valoration: Int
    let comment: String
}

enum ReviewLevel: String, CaseIterable, Identifiable {
    case beginner = "Principiante"
    case n5 = "N5"
    case n4 = "N4"
    case n3 = "N3"
    case n2 = "N2"
    case n1 = "N1"
    case n1Plus = "N1+"

    var id: String { rawValue }
}
