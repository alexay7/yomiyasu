import CoreGraphics
import CoreText
import UIKit

struct MokuroTextStyle {
    let font: UIFont
    let fontSizeOverride: CGFloat
    let scale: CGFloat
    let showBackground: Bool
    let showBorders: Bool
    let isSelected: Bool
}

struct MokuroTextHit {
    let paragraphIndex: Int
    let characterIndex: Int
}

enum TategakiRenderer {
    static func baseFont(named fontName: String?) -> UIFont {
        fontName.flatMap { UIFont(name: $0, size: 12) } ?? UIFont.systemFont(ofSize: 12)
    }

    static func displayRect(for box: MokuroTextBox, scale: CGFloat) -> CGRect {
        CGRect(
            x: box.rect.minX * scale,
            y: box.rect.minY * scale,
            width: box.rect.width * scale,
            height: box.rect.height * scale
        )
    }

    static func effectiveFontSize(boxFontSize: CGFloat, override: CGFloat, scale: CGFloat) -> CGFloat {
        if override > 0 {
            return override
        }
        return max(1, boxFontSize * scale)
    }

    static func effectiveFontSize(for box: MokuroTextBox, style: MokuroTextStyle) -> CGFloat {
        effectiveFontSize(boxFontSize: box.fontSize, override: style.fontSizeOverride, scale: style.scale)
    }

    static func makeAttributedString(textBox: MokuroTextBox, font: UIFont) -> NSAttributedString {
        let text = textBox.paragraphs.map(\.text).joined(separator: "\n")
        let fontSize = font.pointSize

        // Métricas del visor de mokuro (.textBox p): letter-spacing 0.1em y line-height 1.1em.
        // Sin ellas los caracteres se quedan cortos (~10 %) y las columnas/líneas se desalinean.
        let lineHeight = fontSize * 1.1

        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineBreakMode = .byClipping
        paragraphStyle.lineSpacing = 0
        paragraphStyle.paragraphSpacing = 0
        paragraphStyle.minimumLineHeight = lineHeight
        paragraphStyle.maximumLineHeight = lineHeight

        var attributes: [NSAttributedString.Key: Any] = [
            .font: font,
            .foregroundColor: UIColor.black,
            .paragraphStyle: paragraphStyle,
            .kern: fontSize * 0.1,
        ]

        if textBox.isVertical {
            attributes[NSAttributedString.Key(kCTVerticalFormsAttributeName as String)] = true
        }

        return NSAttributedString(string: text, attributes: attributes)
    }

    static func makeFrame(textBox: MokuroTextBox, attributed: NSAttributedString, size: CGSize) -> CTFrame {
        let framesetter = CTFramesetterCreateWithAttributedString(attributed)

        let frameAttributes: [CFString: Any] = [
            kCTFrameProgressionAttributeName: textBox.isVertical
                ? CTFrameProgression.rightToLeft.rawValue
                : CTFrameProgression.topToBottom.rawValue,
        ]

        let path = CGPath(
            rect: CGRect(origin: .zero, size: size),
            transform: nil
        )

        return CTFramesetterCreateFrame(
            framesetter,
            CFRange(location: 0, length: 0),
            path,
            frameAttributes as CFDictionary
        )
    }

    static func draw(
        textBox: MokuroTextBox,
        in context: CGContext,
        style: MokuroTextStyle,
        highlighted: Bool
    ) {
        let rect = displayRect(for: textBox, scale: style.scale)

        if highlighted {
            context.saveGState()
            context.setFillColor(UIColor.systemYellow.withAlphaComponent(0.35).cgColor)
            context.fill(rect)
            context.restoreGState()
        } else if style.showBackground || style.isSelected {
            // Blanco opaco (como el CSS de mokuro): camufla el texto original
            // del manga y hace legible el OCR aunque no coincida al píxel.
            context.saveGState()
            context.setFillColor(UIColor.white.cgColor)
            context.fill(rect)
            context.restoreGState()
        }

        if style.showBorders {
            context.saveGState()
            context.setStrokeColor(UIColor.systemRed.withAlphaComponent(0.4).cgColor)
            context.setLineWidth(1)
            context.stroke(rect)
            context.restoreGState()
        }

        guard highlighted || style.showBackground || style.isSelected else { return }

        let text = textBox.paragraphs.map(\.text).joined(separator: "\n")
        guard !text.isEmpty else { return }

        let fontSize = effectiveFontSize(for: textBox, style: style)
        let font = style.font.withSize(fontSize)
        let attributed = makeAttributedString(textBox: textBox, font: font)
        let frame = makeFrame(textBox: textBox, attributed: attributed, size: rect.size)

        context.saveGState()
        context.textMatrix = .identity
        context.translateBy(x: rect.minX, y: rect.maxY)
        context.scaleBy(x: 1, y: -1)
        CTFrameDraw(frame, context)
        context.restoreGState()
    }

    static func locate(
        textBox: MokuroTextBox,
        pagePoint: CGPoint,
        scale: CGFloat,
        font: UIFont
    ) -> MokuroTextHit? {
        let paragraphs = textBox.paragraphs
        guard !paragraphs.isEmpty else { return nil }

        let rect = displayRect(for: textBox, scale: scale)
        guard rect.width > 0, rect.height > 0 else { return nil }

        let attributed = makeAttributedString(textBox: textBox, font: font)
        guard attributed.length > 0 else { return nil }

        let frame = makeFrame(textBox: textBox, attributed: attributed, size: rect.size)
        let lines = CTFrameGetLines(frame) as! [CTLine]
        guard !lines.isEmpty else { return nil }

        var origins = [CGPoint](repeating: .zero, count: lines.count)
        CTFrameGetLineOrigins(frame, CFRange(location: 0, length: 0), &origins)

        let viewPoint = CGPoint(x: pagePoint.x * scale, y: pagePoint.y * scale)
        let framePoint = CGPoint(
            x: viewPoint.x - rect.minX,
            y: rect.maxY - viewPoint.y
        )

        var bestLine = 0
        var bestDistance = CGFloat.greatestFiniteMagnitude

        for index in 0..<lines.count {
            let origin = origins[index]
            let distance = textBox.isVertical
                ? abs(origin.x - framePoint.x)
                : abs(origin.y - framePoint.y)

            if distance < bestDistance {
                bestDistance = distance
                bestLine = index
            }
        }

        let line = lines[bestLine]
        let origin = origins[bestLine]
        let along = textBox.isVertical
            ? origin.y - framePoint.y
            : framePoint.x - origin.x

        var stringIndex = CTLineGetStringIndexForPosition(line, CGPoint(x: max(along, 0), y: 0))

        if stringIndex == kCFNotFound {
            stringIndex = CTLineGetStringRange(line).location
        }

        return textHit(stringIndex: stringIndex, paragraphs: paragraphs)
    }

    private static func textHit(stringIndex: Int, paragraphs: [MokuroParagraph]) -> MokuroTextHit {
        var offset = 0
        var fallback = MokuroTextHit(paragraphIndex: paragraphs.count - 1, characterIndex: 0)

        for (index, paragraph) in paragraphs.enumerated() {
            let length = paragraph.text.utf16.count

            if stringIndex >= offset, stringIndex <= offset + length, length > 0 {
                let local = max(0, min(stringIndex - offset, length - 1))
                let stringIndexInParagraph = String.Index(utf16Offset: local, in: paragraph.text)
                let characterIndex = paragraph.text.distance(
                    from: paragraph.text.startIndex,
                    to: stringIndexInParagraph
                )

                return MokuroTextHit(
                    paragraphIndex: index,
                    characterIndex: min(characterIndex, max(paragraph.text.count - 1, 0))
                )
            }

            fallback = MokuroTextHit(
                paragraphIndex: index,
                characterIndex: max(paragraph.text.count - 1, 0)
            )
            offset += length + 1
        }

        return fallback
    }
}
