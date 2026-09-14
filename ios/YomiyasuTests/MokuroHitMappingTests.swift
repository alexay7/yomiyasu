import XCTest

@testable import Yomiyasu

final class MokuroHitMappingTests: XCTestCase {
    private func makeBox(
        rect: CGRect,
        vertical: Bool,
        fontSize: CGFloat,
        paragraphs: [String]
    ) -> MokuroTextBox {
        MokuroTextBox(
            id: 0,
            rect: rect,
            fontSize: fontSize,
            isVertical: vertical,
            zIndex: 0,
            paragraphs: paragraphs.enumerated().map {
                MokuroParagraph(id: $0.offset, text: $0.element)
            }
        )
    }

    private func locate(
        _ textBox: MokuroTextBox,
        at point: CGPoint,
        scale: CGFloat = 1
    ) -> MokuroTextHit? {
        let fontSize = TategakiRenderer.effectiveFontSize(
            boxFontSize: textBox.fontSize,
            override: 0,
            scale: scale
        )

        return TategakiRenderer.locate(
            textBox: textBox,
            pagePoint: point,
            scale: scale,
            font: UIFont(name: "IPAexGothic", size: fontSize) ?? .systemFont(ofSize: fontSize)
        )
    }

    func testDisplayRectScalesBoxes() {
        let textBox = makeBox(
            rect: CGRect(x: 531, y: 268, width: 519, height: 293),
            vertical: true,
            fontSize: 32,
            paragraphs: ["あ"]
        )

        let rect = TategakiRenderer.displayRect(for: textBox, scale: 390.0 / 1080.0)

        XCTAssertEqual(rect.minX, 531 * 390.0 / 1080.0, accuracy: 0.001)
        XCTAssertEqual(rect.minY, 268 * 390.0 / 1080.0, accuracy: 0.001)
        XCTAssertEqual(rect.width, 519 * 390.0 / 1080.0, accuracy: 0.001)
        XCTAssertEqual(rect.height, 293 * 390.0 / 1080.0, accuracy: 0.001)
    }

    func testEffectiveFontSizeUsesOverrideOrScaledSize() {
        XCTAssertEqual(
            TategakiRenderer.effectiveFontSize(boxFontSize: 40, override: 0, scale: 0.5),
            20,
            accuracy: 0.001
        )
        XCTAssertEqual(
            TategakiRenderer.effectiveFontSize(boxFontSize: 40, override: 24, scale: 0.5),
            24,
            accuracy: 0.001
        )
    }

    func testHorizontalHitStartsAtFirstCharacter() {
        let textBox = makeBox(
            rect: CGRect(x: 0, y: 0, width: 220, height: 60),
            vertical: false,
            fontSize: 40,
            paragraphs: ["あいうえお"]
        )

        let result = locate(textBox, at: CGPoint(x: 10, y: 30))

        XCTAssertEqual(result?.paragraphIndex, 0)
        XCTAssertEqual(result?.characterIndex, 0)
    }

    func testHorizontalHitEndsAtLastCharacter() {
        let textBox = makeBox(
            rect: CGRect(x: 0, y: 0, width: 220, height: 60),
            vertical: false,
            fontSize: 40,
            paragraphs: ["あいうえお"]
        )

        let result = locate(textBox, at: CGPoint(x: 210, y: 30))

        XCTAssertEqual(result?.paragraphIndex, 0)
        XCTAssertEqual(result?.characterIndex, 4)
    }

    func testVerticalHitTopAndBottom() {
        let textBox = makeBox(
            rect: CGRect(x: 0, y: 0, width: 60, height: 240),
            vertical: true,
            fontSize: 40,
            paragraphs: ["あいうえお"]
        )

        XCTAssertEqual(locate(textBox, at: CGPoint(x: 30, y: 10))?.characterIndex, 0)
        XCTAssertEqual(locate(textBox, at: CGPoint(x: 30, y: 230))?.characterIndex, 4)
    }

    func testVerticalParagraphsFlowRightToLeft() {
        let textBox = makeBox(
            rect: CGRect(x: 0, y: 0, width: 140, height: 240),
            vertical: true,
            fontSize: 40,
            paragraphs: ["あいうえお", "かきくけこ"]
        )

        XCTAssertEqual(locate(textBox, at: CGPoint(x: 110, y: 120))?.paragraphIndex, 0)
        XCTAssertEqual(locate(textBox, at: CGPoint(x: 30, y: 120))?.paragraphIndex, 1)
    }

    func testScaledPageUsesPageCoordinates() {
        let scale = 390.0 / 1080.0
        let textBox = makeBox(
            rect: CGRect(x: 0, y: 0, width: 300, height: 150),
            vertical: false,
            fontSize: 40,
            paragraphs: ["あいうえお"]
        )

        let result = locate(textBox, at: CGPoint(x: 290, y: 75), scale: scale)

        XCTAssertEqual(result?.characterIndex, 4)
    }

    func testHitBeyondTextClampsToLastCharacter() {
        let textBox = makeBox(
            rect: CGRect(x: 0, y: 0, width: 400, height: 60),
            vertical: false,
            fontSize: 40,
            paragraphs: ["あい"]
        )

        let result = locate(textBox, at: CGPoint(x: 390, y: 30))

        XCTAssertEqual(result?.paragraphIndex, 0)
        XCTAssertEqual(result?.characterIndex, 1)
    }
}
