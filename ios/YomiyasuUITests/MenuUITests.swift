import XCTest

final class MenuUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private func menuElement(_ app: XCUIApplication, label: String) -> XCUIElement {
        let button = app.buttons.matching(NSPredicate(format: "label == %@", label)).firstMatch

        if button.waitForExistence(timeout: 5) {
            return button
        }

        return app.descendants(matching: .any)
            .matching(NSPredicate(format: "label == %@", label))
            .firstMatch
    }

    func testBookCardContextMenuShowsOptions() throws {
        let credentials = try E2ECredentials.load()

        guard let serie = credentials.serie else {
            throw XCTSkip("Define serie en LocalFixtures/e2e.json")
        }

        let app = XCUIApplication()
        app.launchEnvironment["YOMIYASU_E2E_USER"] = credentials.user
        app.launchEnvironment["YOMIYASU_E2E_PASSWORD"] = credentials.password
        app.launchEnvironment["YOMIYASU_E2E_NO_SAVE"] = "1"
        app.launchEnvironment["YOMIYASU_E2E_SERIE"] = serie
        app.launch()

        XCTAssertTrue(app.staticTexts["Volúmenes"].waitForExistence(timeout: 90))

        let card = app.buttons
            .matching(NSPredicate(format: "identifier BEGINSWITH 'bookCard-'"))
            .firstMatch

        XCTAssertTrue(card.waitForExistence(timeout: 30), "No se encontró ninguna tarjeta de libro")
        card.press(forDuration: 1.2)

        let readlist = menuElement(app, label: "Añadir serie a Leer más tarde")
        let readlistRemove = app.descendants(matching: .any)
            .matching(NSPredicate(format: "label == 'Quitar serie de Leer más tarde'"))
            .firstMatch
        let markRead = app.descendants(matching: .any)
            .matching(NSPredicate(format: "label == 'Marcar como leído'"))
            .firstMatch

        XCTAssertTrue(
            readlist.exists || readlistRemove.exists || markRead.exists,
            "No apareció el menú contextual de la tarjeta de libro"
        )
    }

    func testSerieCardContextMenuOpensNextVolume() throws {
        let credentials = try E2ECredentials.load()
        let app = launchE2EApp(credentials, book: nil)

        let libraryTab = app.tabBars.buttons["Biblioteca"]
        XCTAssertTrue(libraryTab.waitForExistence(timeout: 90))
        libraryTab.tap()

        let card = app.buttons
            .matching(NSPredicate(format: "identifier BEGINSWITH 'serieCard-'"))
            .firstMatch

        XCTAssertTrue(card.waitForExistence(timeout: 60), "No se encontró ninguna tarjeta de serie")
        card.press(forDuration: 1.2)

        let nextVolume = menuElement(app, label: "Leer siguiente volumen")
        let readAgain = app.descendants(matching: .any)
            .matching(NSPredicate(format: "label == 'Leer de nuevo'"))
            .firstMatch

        XCTAssertTrue(
            nextVolume.exists || readAgain.exists,
            "No apareció el menú contextual de la tarjeta de serie"
        )

        guard nextVolume.exists else { return }

        nextVolume.tap()

        XCTAssertTrue(
            app.staticTexts["readerBookTitle"].waitForExistence(timeout: 90),
            "El menú no abrió el lector con el siguiente volumen"
        )
    }
}
