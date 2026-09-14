import XCTest

final class SerieUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private func launchSerie() throws -> XCUIApplication {
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

        return app
    }

    private func waitForSerie(_ app: XCUIApplication) {
        XCTAssertTrue(
            app.staticTexts["Volúmenes"].waitForExistence(timeout: 90),
            "La ficha de serie no abrió"
        )
    }

    func testSerieOpensWithVolumes() throws {
        let app = try launchSerie()
        waitForSerie(app)
    }

    func testSerieReviewsSectionAndForm() throws {
        let app = try launchSerie()
        waitForSerie(app)

        let reviews = app.staticTexts["Reseñas"]
        var swipes = 0

        while !reviews.exists, swipes < 10 {
            app.swipeUp()
            swipes += 1
        }

        XCTAssertTrue(reviews.exists, "No se encontró la sección de reseñas")

        let writeButton = app.buttons["Escribir reseña"]
        XCTAssertTrue(writeButton.exists)

        writeButton.tap()

        XCTAssertTrue(
            app.navigationBars["Escribir reseña"].waitForExistence(timeout: 10),
            "No se abrió el formulario de reseña"
        )

        XCTAssertTrue(app.staticTexts["Valoración"].exists || app.staticTexts["Comentario"].exists)

        app.buttons["Cancelar"].tap()
    }
}
