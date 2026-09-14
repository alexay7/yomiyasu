import XCTest

@testable import Yomiyasu

final class NovelProgressMapTests: XCTestCase {
    private func makeMap() -> NovelProgressMap {
        NovelProgressMap(
            entries: [
                .init(
                    href: "item/xhtml/ch1.xhtml",
                    mediaType: "application/xhtml+xml",
                    characters: 100,
                    cumulativeBefore: 0
                ),
                .init(
                    href: "item/xhtml/ch2.xhtml",
                    mediaType: "application/xhtml+xml",
                    characters: 200,
                    cumulativeBefore: 100
                ),
                .init(
                    href: "item/xhtml/ch3.xhtml",
                    mediaType: "application/xhtml+xml",
                    characters: 300,
                    cumulativeBefore: 300
                ),
            ],
            containsVerticalText: true
        )
    }

    func testTotalCharacters() {
        XCTAssertEqual(makeMap().totalCharacters, 600)
    }

    func testCharactersAtProgression() {
        let map = makeMap()

        XCTAssertEqual(map.characters(href: "item/xhtml/ch1.xhtml", progression: 0), 0)
        XCTAssertEqual(map.characters(href: "item/xhtml/ch1.xhtml", progression: 0.5), 50)
        XCTAssertEqual(map.characters(href: "item/xhtml/ch2.xhtml", progression: 0.5), 200)
        XCTAssertEqual(map.characters(href: "item/xhtml/ch3.xhtml", progression: 1), 600)
    }

    func testCharactersMatchesBySuffix() {
        let map = makeMap()
        XCTAssertEqual(map.characters(href: "ch2.xhtml", progression: 0.25), 150)
    }

    func testLocationForCharacters() {
        let map = makeMap()

        let start = map.location(forCharacters: 0)
        XCTAssertEqual(start?.href, "item/xhtml/ch1.xhtml")
        XCTAssertEqual(start?.progression, 0)

        let middle = map.location(forCharacters: 200)
        XCTAssertEqual(middle?.href, "item/xhtml/ch2.xhtml")
        XCTAssertEqual(middle?.progression ?? -1, 0.5, accuracy: 0.001)

        let end = map.location(forCharacters: 599)
        XCTAssertEqual(end?.href, "item/xhtml/ch3.xhtml")
        XCTAssertEqual(end?.progression ?? -1, 0.996, accuracy: 0.01)

        let overflow = map.location(forCharacters: 99_999)
        XCTAssertEqual(overflow?.href, "item/xhtml/ch3.xhtml")
        XCTAssertEqual(overflow?.progression ?? -1, 0.997, accuracy: 0.01)
    }

    func testJapaneseCharacterCountingSkipsNonParagraphMarkup() {
        let html = """
        <html><head><style>body { color: red; }</style></head>
        <body><p>こんにちは世界</p><p>ABC 123</p><script>var x = "あ";</script></body></html>
        """

        XCTAssertEqual(NovelProgressMap.japaneseCharacterCount(inHTML: html), 7)
    }

    func testJapaneseCharacterCountingCountsKanaAndKanji() {
        let html = "<html><body><p>カタカナひらがな漢字</p></body></html>"
        XCTAssertEqual(NovelProgressMap.japaneseCharacterCount(inHTML: html), 10)
    }

    func testVerticalWritingDetection() {
        XCTAssertTrue(NovelProgressMap.containsVerticalWriting("writing-mode: vertical-rl;"))
        XCTAssertTrue(NovelProgressMap.containsVerticalWriting("writing-mode:vertical-rl"))
        XCTAssertTrue(NovelProgressMap.containsVerticalWriting("writing-mode: vertical"))
        XCTAssertFalse(NovelProgressMap.containsVerticalWriting("writing-mode: horizontal-tb;"))
        XCTAssertFalse(NovelProgressMap.containsVerticalWriting(".box { color: red; }"))
    }
}
