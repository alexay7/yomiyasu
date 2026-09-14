import XCTest

final class CalendarUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testCalendarDayWithReadingsShowsLogs() throws {
        let credentials = try E2ECredentials.load()
        let app = launchE2EApp(credentials, book: nil)

        let more = app.tabBars.buttons["Más"]
        XCTAssertTrue(more.waitForExistence(timeout: 90))
        more.tap()

        let link = app.staticTexts["Calendario"]
        XCTAssertTrue(link.waitForExistence(timeout: 15), "No se encontró la entrada del calendario")
        link.tap()

        XCTAssertTrue(
            app.navigationBars["Calendario"].waitForExistence(timeout: 20),
            "No se abrió el calendario"
        )

        let dayCell = app.buttons
            .matching(NSPredicate(format: "label CONTAINS 'lecturas'"))
            .firstMatch

        guard dayCell.waitForExistence(timeout: 20) else {
            throw XCTSkip("El mes mostrado no tiene días con lecturas")
        }

        dayCell.tap()

        let logs = app.descendants(matching: .any)
            .matching(NSPredicate(format: "identifier == 'calendarLogs'"))
            .firstMatch

        XCTAssertTrue(
            logs.waitForExistence(timeout: 30),
            "El día con lecturas no mostró la lista de registros"
        )
    }
}
