import XCTest

final class ReaderUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private func launchReaderApp() throws -> XCUIApplication {
        let credentials = try E2ECredentials.load()
        let app = launchE2EApp(credentials, book: credentials.book, page: credentials.page)

        XCTAssertTrue(
            app.staticTexts["readerBookTitle"].waitForExistence(timeout: 90),
            "El lector no llegó a abrirse"
        )

        return app
    }

    func testReaderOpensWithToolbars() throws {
        let app = try launchReaderApp()

        XCTAssertTrue(app.staticTexts["readerPageLabel"].exists)
        XCTAssertTrue(app.buttons["Ajustes"].exists)
        XCTAssertTrue(app.buttons["Texto"].exists)
    }

    func testPageSliderChangesPage() throws {
        let app = try launchReaderApp()

        let label = app.staticTexts["readerPageLabel"]
        let before = label.label

        let slider = app.sliders["Página"]
        XCTAssertTrue(slider.waitForExistence(timeout: 10))
        slider.adjust(toNormalizedSliderPosition: 0.75)

        XCTAssertTrue(
            waitUntil { label.label != before },
            "La página no cambió tras mover el slider"
        )
    }

    func testDictionaryOpensFromOCRBox() throws {
        let app = try launchReaderApp()

        app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()

        let boxes = app.descendants(matching: .any)
            .matching(NSPredicate(format: "identifier BEGINSWITH 'ocrBox-'"))

        guard boxes.count > 0 else {
            throw XCTSkip("La página abierta no tiene cajas OCR visibles")
        }

        let box = boxes.element(boundBy: 0)
        XCTAssertTrue(box.waitForExistence(timeout: 10))

        box.tap()

        XCTAssertTrue(
            app.navigationBars["Diccionario"].waitForExistence(timeout: 30),
            "No se abrió el diccionario"
        )

        holdIfRequested(try E2ECredentials.load())
    }

    func testReaderSettingsSheetOpens() throws {
        let app = try launchReaderApp()

        app.buttons["Ajustes"].tap()

        XCTAssertTrue(
            app.navigationBars["Ajustes del lector"].waitForExistence(timeout: 10),
            "No se abrieron los ajustes del lector"
        )

        XCTAssertTrue(app.switches["Mostrar texto OCR"].exists)

        app.buttons["Hecho"].tap()
        XCTAssertTrue(app.staticTexts["readerBookTitle"].waitForExistence(timeout: 10))
    }

    func testDownloadVolume() throws {
        let credentials = try E2ECredentials.load()

        guard let downloadBook = credentials.downloadBook else {
            throw XCTSkip("Define downloadBook en LocalFixtures/e2e.json para probar descargas")
        }

        let app = launchE2EApp(credentials, book: downloadBook, page: "1")

        XCTAssertTrue(app.staticTexts["readerBookTitle"].waitForExistence(timeout: 90))

        if app.images["Descargado"].waitForExistence(timeout: 5) {
            return
        }

        guard app.buttons["Descargar"].waitForExistence(timeout: 10) else {
            return XCTFail("No se encontró el botón de descarga")
        }

        app.buttons["Descargar"].tap()

        XCTAssertTrue(
            app.images["Descargado"].waitForExistence(timeout: 900),
            "La descarga no terminó"
        )
    }

    func testDownloadsScreenOpens() throws {
        let credentials = try E2ECredentials.load()

        guard credentials.downloadBook != nil else {
            throw XCTSkip("Define downloadBook en LocalFixtures/e2e.json para probar descargas")
        }

        let app = launchE2EApp(credentials, book: nil)

        XCTAssertTrue(app.tabBars.buttons["Más"].waitForExistence(timeout: 90))
        app.tabBars.buttons["Más"].tap()

        let downloadsLink = app.staticTexts["Descargas"]
        XCTAssertTrue(downloadsLink.waitForExistence(timeout: 10))
        downloadsLink.tap()

        XCTAssertTrue(
            app.navigationBars["Descargas"].waitForExistence(timeout: 10),
            "No se abrió la pantalla de Descargas"
        )

        holdIfRequested(credentials)
    }
}
