import Foundation

struct DictionaryDisplay: Decodable, Sendable, Equatable {
    let display: String?
    let words: [DictionaryWord]
}

struct DictionaryWord: Decodable, Sendable, Equatable, Identifiable {
    let id: String
    let frequency: String?
    let pitches: [DictionaryPitch]?
    let kanji: [DictionaryKanji]?
    let kana: [DictionaryKana]?
    let sense: [DictionarySense]?
}

struct DictionaryPitch: Decodable, Sendable, Equatable {
    let position: Int
}

struct DictionaryKanji: Decodable, Sendable, Equatable {
    let common: Bool?
    let text: String
    let tags: [String]?
}

struct DictionaryKana: Decodable, Sendable, Equatable {
    let common: Bool?
    let text: String
    let tags: [String]?
    let appliesToKanji: [String]?
}

struct DictionarySense: Decodable, Sendable, Equatable {
    let partOfSpeech: [String]?
    let appliesToKanji: [String]?
    let appliesToKana: [String]?
    let misc: [String]?
    let gloss: [DictionaryGloss]?
}

struct DictionaryGloss: Decodable, Sendable, Equatable {
    let lang: String?
    let text: String
}

extension DictionaryWord {
    var headword: String {
        kanji?.first?.text ?? kana?.first?.text ?? ""
    }

    var mainReading: String {
        kana?.first?.text ?? ""
    }

    var pitchPositions: [Int] {
        pitches?.map(\.position) ?? []
    }

    var frequencyRank: Int? {
        frequency.flatMap(Int.init)
    }

    var firstGlosses: [String] {
        sense?.first?.gloss?.map(\.text) ?? []
    }
}

struct UserWordRequest: Encodable, Sendable {
    let word: String
    let display: String
    let sentence: String
    let meaning: [String]
    let reading: String
    let frequency: Double
    let pitch: [Int]
}
