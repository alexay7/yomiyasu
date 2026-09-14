import Foundation
import SwiftSoup

struct NovelProgressMap: Sendable {
    struct Entry: Sendable, Equatable {
        let href: String
        let mediaType: String
        let characters: Int
        let cumulativeBefore: Int
    }

    let entries: [Entry]
    let containsVerticalText: Bool

    var totalCharacters: Int {
        guard let last = entries.last else { return 0 }
        return last.cumulativeBefore + last.characters
    }

    func characters(href: String, progression: Double) -> Int {
        guard let entry = entry(forHref: href) else { return 0 }

        let clamped = min(max(progression, 0), 1)
        let within = Int(Double(entry.characters) * clamped)
        return entry.cumulativeBefore + within
    }

    func location(forCharacters characters: Int) -> (href: String, progression: Double)? {
        guard !entries.isEmpty else { return nil }

        let target = max(0, min(characters, max(totalCharacters - 1, 0)))

        for entry in entries where target < entry.cumulativeBefore + entry.characters {
            let within = target - entry.cumulativeBefore
            let progression = entry.characters > 0
                ? Double(within) / Double(entry.characters)
                : 0
            return (entry.href, min(max(progression, 0), 1))
        }

        guard let last = entries.last else { return nil }
        return (last.href, 1)
    }

    private func entry(forHref href: String) -> Entry? {
        if let exact = entries.first(where: { $0.href == href }) {
            return exact
        }

        return entries.first {
            $0.href.hasSuffix(href) || href.hasSuffix($0.href)
        }
    }

    static func japaneseCharacterCount(inHTML html: String) -> Int {
        let text: String

        if let document = try? SwiftSoup.parse(html) {
            let paragraphs = (try? document.select("p").array().compactMap { try $0.text() }) ?? []
            text = paragraphs.joined()
        } else {
            text = html
        }

        return text.unicodeScalars.reduce(0) { count, scalar in
            let value = scalar.value
            let isKana = (0x3040...0x30FF).contains(value)
            let isKanji = (0x4E00...0x9FFF).contains(value)
            return count + ((isKana || isKanji) ? 1 : 0)
        }
    }

    static func containsVerticalWriting(_ content: String) -> Bool {
        content.contains("vertical-rl") || content.contains("writing-mode: vertical")
            || content.contains("writing-mode:vertical")
    }
}
