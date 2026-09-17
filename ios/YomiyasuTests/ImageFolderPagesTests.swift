import CoreGraphics
import XCTest

@testable import Yomiyasu

final class ImageFolderPagesTests: XCTestCase {
    func testMakeBookPrefixesImagesFolderWithoutBoxes() {
        let size = CGSize(width: 1000, height: 1500)
        let book = ImageFolderPages.makeBook(
            pagePaths: ["001.jpg", "002.jpg", "010.jpg"],
            imagesFolder: "Vol 1",
            firstPageSize: size
        )

        XCTAssertEqual(book.pages.count, 3)
        XCTAssertEqual(book.pages.map(\.id), [0, 1, 2])
        XCTAssertEqual(
            book.pages.map(\.imagePath),
            ["Vol 1/001.jpg", "Vol 1/002.jpg", "Vol 1/010.jpg"]
        )
        XCTAssertEqual(book.pages[0].size, size)
        XCTAssertTrue(book.pages.allSatisfy(\.boxes.isEmpty))
    }

    func testMakeBookWithoutImagesFolderKeepsFileName() {
        let book = ImageFolderPages.makeBook(
            pagePaths: ["001.jpg"],
            imagesFolder: nil,
            firstPageSize: nil
        )

        XCTAssertEqual(book.pages[0].imagePath, "001.jpg")
        XCTAssertEqual(book.pages[0].size, ImageFolderPages.defaultPageSize)
    }

    func testJoinedPathIgnoresEmptyFolder() {
        XCTAssertEqual(
            ImageFolderPages.joinedPath(imagesFolder: "Vol 1", fileName: "001.jpg"),
            "Vol 1/001.jpg"
        )
        XCTAssertEqual(
            ImageFolderPages.joinedPath(imagesFolder: "", fileName: "001.jpg"),
            "001.jpg"
        )
        XCTAssertEqual(
            ImageFolderPages.joinedPath(imagesFolder: nil, fileName: "001.jpg"),
            "001.jpg"
        )
    }

    func testSpreadsWorkWithImageFolderPages() {
        let book = ImageFolderPages.makeBook(
            pagePaths: (1...5).map { "\($0).jpg" },
            imagesFolder: "Vol 1",
            firstPageSize: CGSize(width: 1080, height: 1530)
        )

        let spreads = SpreadLayout.spreads(pageCount: book.pages.count, doublePage: true, hasCover: true)

        XCTAssertEqual(spreads.map(\.pages), [[0], [1, 2], [3, 4]])
    }
}
