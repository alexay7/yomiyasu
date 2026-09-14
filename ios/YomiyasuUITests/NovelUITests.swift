import XCTest

final class NovelUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private func launchNovelApp(characters: String? = "30000") throws -> XCUIApplication {
        let credentials = try E2ECredentials.load()

        guard let novelBook = credentials.novelBook else {
            throw XCTSkip("Define novelBook en LocalFixtures/e2e.json para probar el lector de novelas")
        }

        let app = launchE2EApp(credentials, book: novelBook, characters: characters)
        XCTAssertTrue(
            app.staticTexts["readerBookTitle"].waitForExistence(timeout: 120),
            "El lector de novelas no llegó a abrirse"
        )
        return app
    }

    func testNovelReaderOpensWithToolbars() throws {
        let app = try launchNovelApp()

        XCTAssertTrue(app.staticTexts["novelProgressLabel"].exists)
        XCTAssertTrue(app.buttons["Índice"].exists)
        XCTAssertTrue(app.buttons["Ajustes"].exists)
        XCTAssertTrue(
            app.buttons["Descargar"].exists || app.images["Descargado"].exists,
            "No aparece el control de descarga"
        )
    }

    func testNovelTOCSheetOpens() throws {
        let app = try launchNovelApp()

        app.buttons["Índice"].tap()

        XCTAssertTrue(
            app.navigationBars["Índice"].waitForExistence(timeout: 10),
            "No se abrió el índice"
        )

        app.buttons["Cerrar"].tap()
        XCTAssertTrue(app.staticTexts["readerBookTitle"].waitForExistence(timeout: 10))
    }

    func testNovelDictionaryFromSelection() throws {
        let credentials = try E2ECredentials.load()

        guard credentials.novelBook != nil else {
            throw XCTSkip("Define novelBook en LocalFixtures/e2e.json")
        }

        let app = try launchNovelApp()

        var searchItem = app.menuItems["Buscar en Yomiyasu"]
        let offsets: [CGVector] = [
            CGVector(dx: 0.25, dy: 0.4),
            CGVector(dx: 0.2, dy: 0.6),
            CGVector(dx: 0.35, dy: 0.5),
        ]

        for offset in offsets where !searchItem.exists {
            app.coordinate(withNormalizedOffset: offset).press(forDuration: 1.2)
            _ = searchItem.waitForExistence(timeout: 5)
        }

        if !searchItem.exists {
            print("ELEMENT TREE AFTER PRESS:\n\(app.debugDescription)")
        }

        XCTAssertTrue(
            searchItem.exists,
            "El menú de selección no mostró «Buscar en Yomiyasu»"
        )

        searchItem.tap()

        XCTAssertTrue(
            app.navigationBars["Diccionario"].waitForExistence(timeout: 30),
            "No se abrió el diccionario desde la selección"
        )
    }

    func testNovelSettingsSheetOpens() throws {
        let app = try launchNovelApp()

        app.buttons["Ajustes"].tap()

        XCTAssertTrue(
            app.navigationBars["Ajustes del lector"].waitForExistence(timeout: 10)
        )

        app.swipeUp()

        XCTAssertTrue(app.switches["Desplazamiento continuo"].exists)

        app.buttons["Hecho"].tap()
        XCTAssertTrue(app.staticTexts["readerBookTitle"].waitForExistence(timeout: 10))
    }

    func testNovelDownload() throws {
        let credentials = try E2ECredentials.load()

        guard let novelBook = credentials.novelBook else {
            throw XCTSkip("Define novelBook en LocalFixtures/e2e.json")
        }

        let app = launchE2EApp(credentials, book: novelBook)

        XCTAssertTrue(app.staticTexts["readerBookTitle"].waitForExistence(timeout: 120))

        if app.images["Descargado"].waitForExistence(timeout: 5) {
            return
        }

        guard app.buttons["Descargar"].waitForExistence(timeout: 10) else {
            return XCTFail("No se encontró el botón de descarga")
        }

        app.buttons["Descargar"].tap()

        XCTAssertTrue(
            app.images["Descargado"].waitForExistence(timeout: 600),
            "La descarga de la novela no terminó"
        )
    }
}
