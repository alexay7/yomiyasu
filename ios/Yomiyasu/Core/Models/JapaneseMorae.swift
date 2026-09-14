import Foundation

enum JapaneseMorae {
    private static let smallKana: Set<Character> = [
        "ゃ", "ゅ", "ょ", "ぁ", "ぃ", "ぅ", "ぇ", "ぉ", "ゎ",
        "ャ", "ュ", "ョ", "ァ", "ィ", "ゥ", "ェ", "ォ", "ヮ",
    ]

    static func split(_ reading: String) -> [String] {
        var morae: [String] = []

        for character in reading {
            if smallKana.contains(character), !morae.isEmpty {
                morae[morae.count - 1].append(character)
            } else {
                morae.append(String(character))
            }
        }

        return morae
    }

    static func accentPattern(moraeCount: Int, accent: Int) -> [Bool] {
        guard moraeCount > 0 else { return [] }

        if accent <= 0 {
            return (0..<moraeCount).map { $0 > 0 }
        }

        if accent == 1 {
            return (0..<moraeCount).map { $0 == 0 }
        }

        return (0..<moraeCount).map { index in
            index >= 1 && index < accent
        }
    }
}
