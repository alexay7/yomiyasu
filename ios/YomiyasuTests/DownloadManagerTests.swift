import XCTest

@testable import Yomiyasu

@MainActor
final class DownloadManagerTests: XCTestCase {
    private var rootURL: URL!
    private let decoder = JSONDecoder.yomiyasu()

    override func setUp() {
        super.setUp()

        rootURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("yomiyasu-downloads-\(UUID().uuidString)", isDirectory: true)

        URLProtocolStub.handler = nil
    }

    override func tearDown() {
        if let rootURL {
            try? FileManager.default.removeItem(at: rootURL)
        }
        URLProtocolStub.handler = nil
        super.tearDown()
    }

    private func makeAPI() -> APIClient {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [URLProtocolStub.self]

        return APIClient(
            baseURL: URL(string: "https://example.test")!,
            session: URLSession(configuration: configuration)
        )
    }

    private func makeMangaBook() throws -> Book {
        let json = """
        {
          "_id": "b1",
          "path": "serie v01",
          "serie": "s1",
          "seriePath": "serie",
          "pages": 2,
          "visibleName": "Serie v01",
          "imagesFolder": "serie v01",
          "thumbnailPath": "001.jpg",
          "variant": "manga",
          "mokured": false
        }
        """

        return try decoder.decode(Book.self, from: Data(json.utf8))
    }

    private func makeNovelBook() throws -> Book {
        let json = """
        {
          "_id": "n1",
          "path": "Novela v01",
          "serie": "s2",
          "seriePath": "Novela",
          "visibleName": "Novela v01",
          "thumbnailPath": "cover.jpg",
          "variant": "novela",
          "mokured": false
        }
        """

        return try decoder.decode(Book.self, from: Data(json.utf8))
    }

    private func syntheticHTML() -> String {
        """
        <html><head><title>test</title></head><body>
        <div id="page1" class="page"><div class="pageContainer" style="width:1080; height:1530; background-image:url(&quot;serie%20v01/001.jpg&quot;);"><div class="textBox" style="left:10; top:20; width:50; height:30; font-size:20px; z-index:1;"><p>テスト</p></div></div></div>
        <div id="page2" class="page"><div class="pageContainer" style="width:1080; height:1530; background-image:url(&quot;serie%20v01/002.jpg&quot;);"></div></div>
        </body></html>
        """
    }

    private func waitForDownload(_ manager: DownloadManager, bookId: String) async {
        let deadline = Date.now.addingTimeInterval(10)

        while Date.now < deadline {
            if case .downloaded = manager.state(for: bookId) {
                return
            }
            if case .failed(let message) = manager.state(for: bookId) {
                XCTFail("Descarga fallida: \(message)")
                return
            }
            try? await Task.sleep(for: .milliseconds(50))
        }

        XCTFail("La descarga no terminó a tiempo")
    }

    func testMangaDownloadWritesHTMLAndImages() async throws {
        let html = syntheticHTML()

        URLProtocolStub.handler = { request in
            let path = request.url?.path ?? ""

            if path.hasSuffix(".html") {
                return URLProtocolStub.respond(to: request, status: 200, json: html)
            }

            if path.hasSuffix(".jpg") {
                return URLProtocolStub.respond(to: request, status: 200, json: "image-bytes")
            }

            return URLProtocolStub.respond(to: request, status: 404, json: "{}")
        }

        let manager = DownloadManager(api: makeAPI(), rootURL: rootURL)
        let book = try makeMangaBook()

        manager.enqueue(book)
        await waitForDownload(manager, bookId: book.id)

        let fileManager = FileManager.default

        XCTAssertTrue(
            fileManager.fileExists(atPath: manager.localHTMLURL(for: book.id).path)
        )
        XCTAssertTrue(
            fileManager.fileExists(
                atPath: manager.localImagesDirectory(for: book.id)
                    .appendingPathComponent("serie v01/001.jpg").path
            )
        )
        XCTAssertTrue(
            fileManager.fileExists(
                atPath: manager.localImagesDirectory(for: book.id)
                    .appendingPathComponent("serie v01/002.jpg").path
            )
        )

        let record = try XCTUnwrap(manager.records[book.id])
        XCTAssertEqual(record.pageCount, 2)
        XCTAssertGreaterThan(record.byteCount, 0)
        XCTAssertEqual(manager.totalBytes, record.byteCount)
    }

    func testNovelDownloadWritesEpub() async throws {
        URLProtocolStub.handler = { request in
            URLProtocolStub.respond(to: request, status: 200, json: "epub-bytes")
        }

        let manager = DownloadManager(api: makeAPI(), rootURL: rootURL)
        let book = try makeNovelBook()

        manager.enqueue(book)
        await waitForDownload(manager, bookId: book.id)

        XCTAssertTrue(
            FileManager.default.fileExists(atPath: manager.localEpubURL(for: book.id).path)
        )
        XCTAssertEqual(manager.records[book.id]?.pageCount, 0)
    }

    func testManifestPersistsAcrossInstances() async throws {
        URLProtocolStub.handler = { request in
            if request.url?.path.hasSuffix(".html") == true {
                return URLProtocolStub.respond(to: request, status: 200, json: self.syntheticHTML())
            }
            return URLProtocolStub.respond(to: request, status: 200, json: "image-bytes")
        }

        let manager = DownloadManager(api: makeAPI(), rootURL: rootURL)
        let book = try makeMangaBook()

        manager.enqueue(book)
        await waitForDownload(manager, bookId: book.id)

        let reloaded = DownloadManager(api: makeAPI(), rootURL: rootURL)

        XCTAssertEqual(reloaded.records[book.id]?.visibleName, "Serie v01")
        XCTAssertTrue(reloaded.isDownloaded(book.id))
        XCTAssertEqual(reloaded.totalBytes, manager.totalBytes)
    }

    func testDeleteRemovesFilesAndRecord() async throws {
        URLProtocolStub.handler = { request in
            URLProtocolStub.respond(to: request, status: 200, json: "bytes")
        }

        let manager = DownloadManager(api: makeAPI(), rootURL: rootURL)
        let book = try makeNovelBook()

        manager.enqueue(book)
        await waitForDownload(manager, bookId: book.id)

        manager.delete(book.id)

        XCTAssertFalse(manager.isDownloaded(book.id))
        XCTAssertFalse(
            FileManager.default.fileExists(atPath: manager.bookDirectory(book.id).path)
        )
        XCTAssertEqual(manager.state(for: book.id), .notDownloaded)
    }

    func testFailedDownloadCleansUp() async throws {
        URLProtocolStub.handler = { request in
            URLProtocolStub.respond(to: request, status: 500, json: #"{"statusCode":500}"#)
        }

        let manager = DownloadManager(api: makeAPI(), rootURL: rootURL)
        let book = try makeNovelBook()

        manager.enqueue(book)

        let deadline = Date.now.addingTimeInterval(5)
        while Date.now < deadline {
            if case .failed = manager.state(for: book.id) {
                break
            }
            try? await Task.sleep(for: .milliseconds(50))
        }

        guard case .failed = manager.state(for: book.id) else {
            return XCTFail("Se esperaba estado fallido")
        }

        XCTAssertFalse(
            FileManager.default.fileExists(atPath: manager.bookDirectory(book.id).path)
        )
    }
}
