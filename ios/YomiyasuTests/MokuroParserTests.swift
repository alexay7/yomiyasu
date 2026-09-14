import XCTest

@testable import Yomiyasu

final class MokuroParserTests: XCTestCase {
    private func loadSynthetic() throws -> MokuroBook {
        let url = try XCTUnwrap(
            Bundle(for: MokuroParserTests.self)
                .url(forResource: "synthetic_mokuro", withExtension: "html")
        )
        let html = try String(contentsOf: url, encoding: .utf8)
        return try MokuroParser.parse(html: html)
    }

    func testSyntheticFixtureParsesAllPages() throws {
        let book = try loadSynthetic()

        XCTAssertEqual(book.pages.count, 5)
        XCTAssertEqual(book.pages.map(\.id), [0, 1, 2, 3, 4])
    }

    func testPageWithSingleHorizontalBox() throws {
        let book = try loadSynthetic()
        let page = book.pages[0]

        XCTAssertEqual(page.imagePath, "serie%20v01/001-or8_compressed.jpg")
        XCTAssertEqual(page.size.width, 1080)
        XCTAssertEqual(page.size.height, 1530)
        XCTAssertEqual(page.boxes.count, 1)

        let box = page.boxes[0]
        XCTAssertEqual(box.rect, CGRect(x: 191, y: 1423, width: 685, height: 21))
        XCTAssertEqual(box.fontSize, 21)
        XCTAssertFalse(box.isVertical)
        XCTAssertEqual(box.paragraphs.map(\.text), ["★この作品はテストです"])
    }

    func testPageWithHorizontalAndVerticalBoxes() throws {
        let book = try loadSynthetic()
        let page = book.pages[1]

        XCTAssertEqual(page.boxes.count, 2)

        let horizontal = page.boxes[0]
        XCTAssertFalse(horizontal.isVertical)
        XCTAssertEqual(
            horizontal.paragraphs.map(\.text),
            ["もし芸能人の子供に", "生まれていたらと", "考えた事はある？"]
        )

        let vertical = page.boxes[1]
        XCTAssertTrue(vertical.isVertical)
        XCTAssertEqual(vertical.zIndex, 15)
        XCTAssertEqual(vertical.paragraphs.count, 3)
    }

    func testPageWithoutTextBoxesIsKept() throws {
        let book = try loadSynthetic()
        XCTAssertTrue(book.pages[2].boxes.isEmpty)
    }

    func testWhitespaceOnlyParagraphsAreSkipped() throws {
        let book = try loadSynthetic()
        XCTAssertTrue(book.pages[3].boxes.isEmpty)
    }

    func testUnknownFontSizeFallsBackToDefault() throws {
        let book = try loadSynthetic()
        let box = try XCTUnwrap(book.pages[4].boxes.first)
        XCTAssertEqual(box.fontSize, 16)
    }

    func testStyleParsing() {
        let style = MokuroParser.parseStyle(
            "width:1080; height:1530; background-image:url(\"a/b.jpg\"); font-size:21px; z-index:15; writing-mode:vertical-rl;"
        )

        XCTAssertEqual(style["width"], "1080")
        XCTAssertEqual(style["font-size"], "21px")
        XCTAssertEqual(style["writing-mode"], "vertical-rl")
        XCTAssertEqual(style["background-image"], "url(\"a/b.jpg\")")
    }

    func testBackgroundImagePathVariants() {
        XCTAssertEqual(
            MokuroParser.backgroundImagePath("url(\"oshi%20v01/001.jpg\")"),
            "oshi%20v01/001.jpg"
        )
        XCTAssertEqual(
            MokuroParser.backgroundImagePath("url('a/b c.jpg')"),
            "a/b c.jpg"
        )
        XCTAssertEqual(
            MokuroParser.backgroundImagePath("url(images/001.jpg)"),
            "images/001.jpg"
        )
        XCTAssertNil(MokuroParser.backgroundImagePath("url()"))
    }

    func testNumberParsing() {
        XCTAssertEqual(MokuroParser.number("1080"), 1080)
        XCTAssertEqual(MokuroParser.number("21px"), 21)
        XCTAssertEqual(MokuroParser.number(" 1.5em"), 1.5)
        XCTAssertNil(MokuroParser.number("auto"))
    }

    func testRealProductionFixture() throws {
        guard let url = Bundle(for: MokuroParserTests.self)
            .url(forResource: "sample_manga", withExtension: "html") else {
            throw XCTSkip("LocalFixtures/sample_manga.html no está presente")
        }

        let html = try String(contentsOf: url, encoding: .utf8)
        let book = try MokuroParser.parse(html: html)

        XCTAssertEqual(book.pages.count, 223)

        let firstPage = try XCTUnwrap(book.pages.first)
        XCTAssertEqual(firstPage.imagePath, "oshi%20v01/000-or8_compressed.jpg")
        XCTAssertEqual(firstPage.size.width, 1080)
        XCTAssertEqual(firstPage.size.height, 1530)

        let thirdPage = try XCTUnwrap(book.pages.dropFirst(2).first)
        XCTAssertTrue(thirdPage.imagePath.contains("002-"))
        XCTAssertGreaterThanOrEqual(thirdPage.boxes.count, 4)
        XCTAssertTrue(thirdPage.boxes.contains { $0.isVertical })

        let totalBoxes = book.pages.reduce(0) { $0 + $1.boxes.count }
        XCTAssertGreaterThan(totalBoxes, 200)

        let emptyPages = book.pages.filter { $0.boxes.isEmpty }.count
        XCTAssertGreaterThan(emptyPages, 0)
    }
}
