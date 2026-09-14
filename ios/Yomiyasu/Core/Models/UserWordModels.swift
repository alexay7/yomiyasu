import Foundation

struct UserWord: Decodable, Sendable, Identifiable, Equatable {
    let word: String
    let display: String
    let sentence: String
    let meaning: [String]
    let reading: String
    let frequency: Int
    let pitch: [Int]
    let createdAt: Date?

    var id: String { word }
}

enum WordsSort: String, CaseIterable, Identifiable {
    case newest
    case oldest = "new"
    case frequencyDesc = "frequency"
    case frequencyAsc = "!frequency"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .newest: "Recientes"
        case .oldest: "Antiguas"
        case .frequencyDesc: "Más frecuentes"
        case .frequencyAsc: "Menos frecuentes"
        }
    }

    var queryValue: String? {
        switch self {
        case .newest: nil
        case .oldest, .frequencyDesc, .frequencyAsc: rawValue
        }
    }
}

extension UserWord {
    var frequencyLabel: String {
        switch frequency {
        case 0: "—"
        case ..<1500: "Muy alta"
        case ..<5000: "Alta"
        case ..<15000: "Media"
        case ..<30000: "Baja"
        default: "Muy baja"
        }
    }
}
