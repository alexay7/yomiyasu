import CoreText
import XCTest

@testable import Yomiyasu

final class TategakiMetricsTests: XCTestCase {
    private let fontSize: CGFloat = 40

    private func makeBox(vertical: Bool) -> MokuroTextBox {
        MokuroTextBox(
            id: 0,
            rect: CGRect(x: 0, y: 0, width: 200, height: 2000),
            fontSize: fontSize,
            isVertical: vertical,
            zIndex: 0,
            paragraphs: [
                MokuroParagraph(id: 0, text: "あいうえおかきくけこさしすせそたちつてと"),
                MokuroParagraph(id: 1, text: "なにぬねの"),
            ]
        )
    }

    private func measure(vertical: Bool) -> (lineWidth: CGFloat, pitch: CGFloat) {
        let font = UIFont(name: "IPAexGothic", size: fontSize) ?? .systemFont(ofSize: fontSize)
        let box = makeBox(vertical: vertical)

        let attributed = TategakiRenderer.makeAttributedString(textBox: box, font: font)
        let frame = TategakiRenderer.makeFrame(
            textBox: box,
            attributed: attributed,
            size: CGSize(width: 200, height: 2000)
        )

        let lines = CTFrameGetLines(frame) as! [CTLine]
        var origins = [CGPoint](repeating: .zero, count: lines.count)
        CTFrameGetLineOrigins(frame, CFRange(location: 0, length: 0), &origins)

        let lineWidth = lines
            .map { CTLineGetTypographicBounds($0, nil, nil, nil) }
            .max() ?? 0

        let pitch = lines.count > 1
            ? abs(vertical ? origins[0].x - origins[1].x : origins[0].y - origins[1].y)
            : 0

        return (lineWidth, pitch)
    }

    func testVerticalColumnPitchMatchesMokuroLineHeight() {
        let result = measure(vertical: true)

        XCTAssertEqual(result.pitch, fontSize * 1.1, accuracy: 0.5)
    }

    func testHorizontalLinePitchMatchesMokuroLineHeight() {
        let result = measure(vertical: false)

        XCTAssertEqual(result.pitch, fontSize * 1.1, accuracy: 0.5)
    }

    func testVerticalCharacterAdvanceIncludesMokuroLetterSpacing() {
        let result = measure(vertical: true)
        let advance = result.lineWidth / 20

        XCTAssertEqual(advance, fontSize * 1.1, accuracy: 0.5)
    }

    func testHorizontalCharacterAdvanceIncludesMokuroLetterSpacing() {
        let result = measure(vertical: false)
        let advance = result.lineWidth / 20

        XCTAssertEqual(advance, fontSize * 1.1, accuracy: 0.5)
    }
}
