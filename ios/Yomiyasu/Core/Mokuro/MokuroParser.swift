import CoreGraphics
import Foundation
import SwiftSoup

struct MokuroBook: Sendable {
    let pages: [MokuroPage]
}

struct MokuroPage: Identifiable, Sendable {
    let id: Int
    let imagePath: String
    let size: CGSize
    let boxes: [MokuroTextBox]
}

struct MokuroTextBox: Identifiable, Sendable {
    let id: Int
    let rect: CGRect
    let fontSize: CGFloat
    let isVertical: Bool
    let zIndex: Int
    let paragraphs: [MokuroParagraph]
}

struct MokuroParagraph: Identifiable, Sendable {
    let id: Int
    let text: String
}

enum MokuroParserError: Error {
    case invalidHTML
}

enum MokuroParser {
    static func parse(html: String) throws -> MokuroBook {
        let document: Document

        do {
            document = try SwiftSoup.parse(html)
        } catch {
            throw MokuroParserError.invalidHTML
        }

        let pageElements = try document.select("div.page")

        var pages: [MokuroPage] = []
        pages.reserveCapacity(pageElements.count)

        for pageElement in pageElements {
            guard let container = try pageElement.select("div.pageContainer").first() else {
                continue
            }

            let containerStyle = parseStyle(try container.attr("style"))

            guard let width = containerStyle["width"].flatMap(number),
                  let height = containerStyle["height"].flatMap(number),
                  width > 0,
                  height > 0,
                  let imagePath = containerStyle["background-image"].flatMap(backgroundImagePath),
                  !imagePath.isEmpty else {
                continue
            }

            let textBoxElements = try container.select("div.textBox")
            var boxes: [MokuroTextBox] = []
            boxes.reserveCapacity(textBoxElements.count)

            for (boxIndex, boxElement) in textBoxElements.array().enumerated() {
                let boxStyle = parseStyle(try boxElement.attr("style"))

                let left = boxStyle["left"].flatMap(number) ?? 0
                let top = boxStyle["top"].flatMap(number) ?? 0
                let boxWidth = boxStyle["width"].flatMap(number) ?? 0
                let boxHeight = boxStyle["height"].flatMap(number) ?? 0
                let fontSize = boxStyle["font-size"].flatMap(number) ?? 16
                let isVertical = boxStyle["writing-mode"]?.contains("vertical") ?? false
                let zIndex = boxStyle["z-index"].flatMap(int) ?? 0

                guard boxWidth > 0, boxHeight > 0 else { continue }

                let paragraphElements = try boxElement.select("p").array()
                var paragraphTexts: [String] = []

                for paragraphElement in paragraphElements {
                    let text = try paragraphElement.text()
                    if !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        paragraphTexts.append(text)
                    }
                }

                guard !paragraphTexts.isEmpty else { continue }

                boxes.append(
                    MokuroTextBox(
                        id: boxIndex,
                        rect: CGRect(x: left, y: top, width: boxWidth, height: boxHeight),
                        fontSize: fontSize,
                        isVertical: isVertical,
                        zIndex: zIndex,
                        paragraphs: paragraphTexts.enumerated().map {
                            MokuroParagraph(id: $0.offset, text: $0.element)
                        }
                    )
                )
            }

            boxes.sort { $0.zIndex < $1.zIndex }

            pages.append(
                MokuroPage(
                    id: pages.count,
                    imagePath: imagePath,
                    size: CGSize(width: width, height: height),
                    boxes: boxes
                )
            )
        }

        return MokuroBook(pages: pages)
    }

    static func parseStyle(_ style: String) -> [String: String] {
        var result: [String: String] = [:]

        for declaration in style.split(separator: ";") {
            guard let separatorIndex = declaration.firstIndex(of: ":") else { continue }

            let key = declaration[..<separatorIndex]
                .trimmingCharacters(in: .whitespacesAndNewlines)
                .lowercased()
            let value = declaration[declaration.index(after: separatorIndex)...]
                .trimmingCharacters(in: .whitespacesAndNewlines)

            if !key.isEmpty, !value.isEmpty {
                result[key] = value
            }
        }

        return result
    }

    static func backgroundImagePath(_ value: String) -> String? {
        var path = value

        if let range = path.range(of: "url(", options: .caseInsensitive) {
            path = String(path[range.upperBound...])
        }

        path = path.trimmingCharacters(in: CharacterSet(charactersIn: "\"' )"))

        return path.isEmpty ? nil : path
    }

    static func number(_ value: String) -> CGFloat? {
        var digits = ""
        var separatorSeen = false

        for character in value.trimmingCharacters(in: .whitespacesAndNewlines) {
            if character.isNumber {
                digits.append(character)
            } else if character == "." || character == "," {
                if separatorSeen { break }
                digits.append(".")
                separatorSeen = true
            } else {
                break
            }
        }

        guard let double = Double(digits) else { return nil }
        return CGFloat(double)
    }

    static func int(_ value: String) -> Int? {
        Int(number(value) ?? 0)
    }
}
