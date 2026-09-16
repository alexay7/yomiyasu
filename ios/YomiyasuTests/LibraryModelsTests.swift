import XCTest

@testable import Yomiyasu

final class LibraryModelsTests: XCTestCase {
    private let decoder = JSONDecoder.yomiyasu()

    func testSerieListDecodingWithReadlistObjectAndBookCurrentBook() throws {
        let json = """
        {
          "_id": "s1",
          "path": "seriePath",
          "variant": "manga",
          "visibleName": "Serie de prueba",
          "sortName": "Serie de prueba",
          "bookCount": 5,
          "difficulty": 4.2,
          "createdDate": "2024-01-01T00:00:00.000Z",
          "lastModifiedDate": "2025-06-01T10:00:00.000Z",
          "status": "PUBLISHING",
          "summary": "<p>Resumen</p>",
          "authors": ["Autor"],
          "genres": ["Acción"],
          "missing": false,
          "valoration": 7.5,
          "alternativeNames": [],
          "unreadBooks": 3,
          "type": "serie",
          "paused": false,
          "readlist": {"_id": "r1", "user": "u1", "serie": "s1", "addedDate": "2025-01-01T00:00:00.000Z"},
          "serieprogress": null,
          "seriereadlist": {"_id": "r1"},
          "thumbnailPath": "seriePath/thumbs/thumb.jpg",
          "currentBook": {
            "_id": "b1",
            "visibleName": "Serie de prueba v01",
            "seriePath": "seriePath",
            "imagesFolder": "images",
            "thumbnailPath": "001.jpg",
            "variant": "manga",
            "mokured": false,
            "characters": 1000
          },
          "__v": 0
        }
        """

        let serie = try decoder.decode(Serie.self, from: Data(json.utf8))

        XCTAssertEqual(serie.id, "s1")
        XCTAssertEqual(serie.visibleName, "Serie de prueba")
        XCTAssertEqual(serie.unreadCount, 3)
        XCTAssertTrue(serie.isInReadlist)
        XCTAssertFalse(serie.isPaused)
        XCTAssertEqual(serie.plainSummary, "Resumen")

        guard case .book(let currentBook)? = serie.currentBook else {
            return XCTFail("Se esperaba un libro en currentBook")
        }
        XCTAssertEqual(currentBook.id, "b1")

        let modified = try XCTUnwrap(serie.lastModifiedDate)
        XCTAssertEqual(modified.timeIntervalSince1970, 1748772000, accuracy: 1)
    }

    func testSerieDetailDecodingWithReadlistBoolAndCurrentBookId() throws {
        let json = """
        {
          "_id": "s1",
          "path": "seriePath",
          "variant": "novela",
          "visibleName": "Novela",
          "sortName": "Novela",
          "bookCount": 2,
          "difficulty": 0,
          "valoration": 0,
          "readlist": true,
          "unreadBooks": 0,
          "type": "serie",
          "paused": true,
          "thumbnailPath": "seriePath/cover.jpg",
          "currentBook": "b2",
          "reviews": [
            {
              "_id": "rev1",
              "user": "u1",
              "serie": "s1",
              "userLevel": "N3",
              "difficulty": 3,
              "valoration": 8,
              "comment": "Muy bien",
              "name": "alex"
            }
          ]
        }
        """

        let serie = try decoder.decode(Serie.self, from: Data(json.utf8))

        XCTAssertTrue(serie.isInReadlist)
        XCTAssertTrue(serie.isPaused)
        XCTAssertEqual(serie.unreadCount, 0)
        XCTAssertEqual(serie.reviews?.first?.name, "alex")
        XCTAssertEqual(serie.currentBook?.id, "b2")
    }

    func testSerieDecodingWithNullReadlist() throws {
        let json = """
        {
          "_id": "s2",
          "visibleName": "Sin lista",
          "readlist": null,
          "unreadBooks": 1
        }
        """

        let serie = try decoder.decode(Serie.self, from: Data(json.utf8))
        XCTAssertFalse(serie.isInReadlist)
    }

    func testBookDecodingWithProgressAndPageChars() throws {
        let json = """
        {
          "_id": "b1",
          "path": "bookPath",
          "serie": "s1",
          "seriePath": "seriePath",
          "pages": 180,
          "visibleName": "Serie v01",
          "sortName": "Serie v01",
          "imagesFolder": "images",
          "thumbnailPath": "001.jpg",
          "characters": 12000,
          "pageChars": [100, 120],
          "variant": "manga",
          "mokured": false,
          "status": "reading",
          "type": "book",
          "lastProgress": {
            "_id": "p1",
            "book": "b1",
            "serie": "s1",
            "time": 3600,
            "currentPage": 90,
            "status": "reading",
            "paused": false,
            "characters": 6000,
            "variant": "manga",
            "lastUpdateDate": "2025-06-01T10:00:00.000Z"
          }
        }
        """

        let book = try decoder.decode(Book.self, from: Data(json.utf8))

        XCTAssertEqual(book.pages, 180)
        XCTAssertEqual(book.pageChars, [100, 120])
        XCTAssertEqual(book.resolvedStatus, .reading)
        XCTAssertEqual(book.progressFraction, 0.5, accuracy: 0.001)
    }

    func testBookProgressFallbackToCharactersForNovels() throws {
        let json = """
        {
          "_id": "b2",
          "visibleName": "Novela v01",
          "characters": 100000,
          "variant": "novela",
          "mokured": false,
          "status": "reading",
          "lastProgress": {
            "characters": 90000
          }
        }
        """

        let book = try decoder.decode(Book.self, from: Data(json.utf8))
        XCTAssertEqual(book.progressFraction, 0.9, accuracy: 0.001)
    }

    func testEmptyReadProgressDecodes() throws {
        let progress = try decoder.decode(ReadProgress.self, from: Data("{}".utf8))
        XCTAssertNil(progress.id)
        XCTAssertNil(progress.status)
    }

    func testSerieCoverURLs() throws {
        let baseURL = URL(string: "https://example.test")!
        let mangaJSON = """
        {"_id": "s1", "visibleName": "M", "variant": "manga",
         "thumbnailPath": "seriePath/images/thumb.jpg"}
        """
        let novelaJSON = """
        {"_id": "s2", "visibleName": "N", "variant": "novela",
         "thumbnailPath": "seriePath/thumb.jpg"}
        """

        let manga = try decoder.decode(Serie.self, from: Data(mangaJSON.utf8))
        let novela = try decoder.decode(Serie.self, from: Data(novelaJSON.utf8))

        XCTAssertEqual(
            StaticURLs.serieCover(manga, baseURL: baseURL)?.absoluteString,
            "https://example.test/api/static/mangas/seriePath/images/thumb.jpg"
        )
        XCTAssertEqual(
            StaticURLs.serieCover(novela, baseURL: baseURL)?.absoluteString,
            "https://example.test/api/static/novelas/seriePath/thumb.jpg"
        )
    }

    func testBookCoverURLs() throws {
        let baseURL = URL(string: "https://example.test")!
        let mangaJSON = """
        {"_id": "b1", "visibleName": "M", "variant": "manga", "mokured": false,
         "seriePath": "seriePath", "imagesFolder": "images", "thumbnailPath": "001.jpg"}
        """
        let novelaJSON = """
        {"_id": "b2", "visibleName": "N", "variant": "novela", "mokured": false,
         "seriePath": "novelaPath", "thumbnailPath": "cover.jpg"}
        """
        let mokuredJSON = """
        {"_id": "b3", "visibleName": "NM", "variant": "novela", "mokured": true,
         "seriePath": "novelaPath", "imagesFolder": "images", "thumbnailPath": "001.jpg"}
        """

        let manga = try decoder.decode(Book.self, from: Data(mangaJSON.utf8))
        let novela = try decoder.decode(Book.self, from: Data(novelaJSON.utf8))
        let mokured = try decoder.decode(Book.self, from: Data(mokuredJSON.utf8))

        XCTAssertEqual(
            StaticURLs.bookCover(manga, baseURL: baseURL)?.absoluteString,
            "https://example.test/api/static/mangas/seriePath/images/001.jpg"
        )
        XCTAssertEqual(
            StaticURLs.bookCover(novela, baseURL: baseURL)?.absoluteString,
            "https://example.test/api/static/novelas/novelaPath/cover.jpg"
        )
        XCTAssertEqual(
            StaticURLs.bookCover(mokured, baseURL: baseURL)?.absoluteString,
            "https://example.test/api/static/novelas/novelaPath/images/001.jpg"
        )
    }

    func testCoverURLEncodesJapaneseCharacters() throws {
        let baseURL = URL(string: "https://example.test")!
        let json = """
        {"_id": "s1", "visibleName": "M", "variant": "manga",
         "thumbnailPath": "ぼくの/サムネ イル.jpg"}
        """

        let serie = try decoder.decode(Serie.self, from: Data(json.utf8))
        let url = try XCTUnwrap(StaticURLs.serieCover(serie, baseURL: baseURL))

        XCTAssertEqual(
            url.absoluteString,
            "https://example.test/api/static/mangas/"
                + "%E3%81%BC%E3%81%8F%E3%81%AE/%E3%82%B5%E3%83%A0%E3%83%8D%20%E3%82%A4%E3%83%AB.jpg"
        )
    }

    func testSeriesQueryItems() {
        var query = SeriesQuery()
        query.variant = .manga
        query.firstLetter = "SPECIAL"
        query.minDifficulty = 3
        query.maxDifficulty = 8
        query.minValoration = 4
        query.maxValoration = 9
        query.valorationCount = 3
        query.readlistOnly = true
        query.readprogress = .reading
        query.sort = SortValue(key: "difficulty", descending: true)
        query.page = 2
        query.limit = 50

        let items = Dictionary(
            uniqueKeysWithValues: query.queryItems.map { ($0.name, $0.value) }
        )

        XCTAssertEqual(items["firstLetter"], "SPECIAL")
        XCTAssertEqual(items["min"], "3")
        XCTAssertEqual(items["max"], "8")
        XCTAssertEqual(items["valorationMin"], "4")
        XCTAssertEqual(items["valorationMax"], "9")
        XCTAssertEqual(items["valorationCount"], "3")
        XCTAssertEqual(items["readlist"], "true")
        XCTAssertEqual(items["readprogress"], "reading")
        XCTAssertEqual(items["sort"], "!difficulty")
        XCTAssertEqual(items["page"], "2")
        XCTAssertEqual(items["limit"], "50")
    }

    func testSeriesQueryValorationFilteringScope() {
        var query = SeriesQuery(variant: .manga)
        query.minValoration = 5
        query.valorationCount = 2

        XCTAssertTrue(query.isFiltering)

        let queryNames = query.queryItems.map(\.name)
        XCTAssertTrue(queryNames.contains("valorationMin"))
        XCTAssertTrue(queryNames.contains("valorationCount"))
        XCTAssertFalse(queryNames.contains("valorationMax"))

        let alphabetNames = query.alphabetQueryItems.map(\.name)
        XCTAssertTrue(alphabetNames.contains("valorationMin"))
        XCTAssertTrue(alphabetNames.contains("valorationCount"))

        let randomNames = query.randomQueryItems.map(\.name)
        XCTAssertFalse(randomNames.contains("valorationMin"))
        XCTAssertFalse(randomNames.contains("valorationCount"))
        XCTAssertFalse(randomNames.contains("valorationMax"))

        query.valorationCount = nil
        query.minValoration = nil
        XCTAssertFalse(query.isFiltering)
    }

    func testResetFiltersClearsValoration() {
        var query = SeriesQuery()
        query.minValoration = 3
        query.maxValoration = 8
        query.valorationCount = 1

        let reset = SeriesQuery.resetFilters(query)

        XCTAssertNil(reset.minValoration)
        XCTAssertNil(reset.maxValoration)
        XCTAssertNil(reset.valorationCount)
        XCTAssertFalse(reset.isFiltering)
    }

    func testRandomCriteriaRoundTripAndApplication() throws {
        var query = SeriesQuery(variant: .manga)
        query.genre = "Acción"
        query.author = "Autor"
        query.status = .publishing
        query.firstLetter = "A"
        query.minDifficulty = 2
        query.maxDifficulty = 7
        query.readprogress = .reading
        query.readlistOnly = true

        let data = try JSONEncoder().encode(RandomCriteria(query: query))
        let decoded = try JSONDecoder().decode(RandomCriteria.self, from: data)

        let applied = decoded.applying(to: SeriesQuery(variant: .manga))

        XCTAssertEqual(applied.genre, "Acción")
        XCTAssertEqual(applied.author, "Autor")
        XCTAssertEqual(applied.status, .publishing)
        XCTAssertEqual(applied.firstLetter, "A")
        XCTAssertEqual(applied.minDifficulty, 2)
        XCTAssertEqual(applied.maxDifficulty, 7)
        XCTAssertEqual(applied.readprogress, .reading)
        XCTAssertTrue(applied.readlistOnly)

        let randomNames = applied.randomQueryItems.map(\.name)
        XCTAssertFalse(randomNames.contains("valorationMin"))
        XCTAssertFalse(randomNames.contains("valorationCount"))
    }

    @MainActor
    func testRandomCriteriaStoreRoundTrip() {
        let suite = "random-criteria-tests"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)

        let store = RandomCriteriaStore(defaults: defaults)

        var query = SeriesQuery(variant: .novela)
        query.genre = "Drama"
        query.readlistOnly = true

        store.save(RandomCriteria(query: query), variant: .novela)

        let loaded = store.criteria(variant: .novela)
        XCTAssertEqual(loaded?.genre, "Drama")
        XCTAssertEqual(loaded?.readlistOnly, true)
        XCTAssertNil(store.criteria(variant: .manga))
    }

    func testBooksQueryOmitsBooksDefaultsForSerieListing() {
        let query = BooksQuery(variant: .manga, serie: "s1", sort: .booksDefault)
        let names = query.queryItems.map(\.name)

        XCTAssertEqual(names, ["serie", "sort"])
    }
}
