import XCTest

struct E2ECredentials {
    let user: String
    let password: String
    let book: String?
    let page: String?
    let holdSeconds: Double?
    let downloadBook: String?
    let novelBook: String?
    let serie: String?

    static func load() throws -> E2ECredentials {
        let environment = ProcessInfo.processInfo.environment

        if let user = environment["YOMIYASU_E2E_USER"],
           let password = environment["YOMIYASU_E2E_PASSWORD"] {
            return E2ECredentials(
                user: user,
                password: password,
                book: environment["YOMIYASU_E2E_BOOK"],
                page: environment["YOMIYASU_E2E_PAGE"],
                holdSeconds: nil,
                downloadBook: nil,
                novelBook: nil,
                serie: environment["YOMIYASU_E2E_SERIE"]
            )
        }

        let fixturesURL = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appendingPathComponent("LocalFixtures/e2e.json")

        guard let data = try? Data(contentsOf: fixturesURL),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: String],
              let user = json["user"],
              let password = json["password"] else {
            throw XCTSkip(
                "Define LocalFixtures/e2e.json o YOMIYASU_E2E_USER/YOMIYASU_E2E_PASSWORD"
            )
        }

        return E2ECredentials(
            user: user,
            password: password,
            book: json["book"],
            page: json["page"],
            holdSeconds: json["hold"].flatMap(Double.init),
            downloadBook: json["downloadBook"],
            novelBook: json["novelBook"],
            serie: json["serie"]
        )
    }
}

extension XCTestCase {
    func launchE2EApp(
        _ credentials: E2ECredentials,
        book: String?,
        page: String? = nil,
        characters: String? = nil,
        noSave: Bool = true
    ) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchEnvironment["YOMIYASU_E2E_USER"] = credentials.user
        app.launchEnvironment["YOMIYASU_E2E_PASSWORD"] = credentials.password

        if noSave {
            app.launchEnvironment["YOMIYASU_E2E_NO_SAVE"] = "1"
        }

        if let book {
            app.launchEnvironment["YOMIYASU_E2E_BOOK"] = book
        }

        if let page {
            app.launchEnvironment["YOMIYASU_E2E_PAGE"] = page
        }

        if let characters {
            app.launchEnvironment["YOMIYASU_E2E_CHARACTERS"] = characters
        }

        app.launch()
        return app
    }

    func holdIfRequested(_ credentials: E2ECredentials) {
        guard let seconds = credentials.holdSeconds else { return }
        RunLoop.current.run(until: Date.now.addingTimeInterval(seconds))
    }

    func waitUntil(timeout: TimeInterval = 15, _ condition: () -> Bool) -> Bool {
        let deadline = Date.now.addingTimeInterval(timeout)

        while Date.now < deadline {
            if condition() {
                return true
            }
            RunLoop.current.run(until: Date.now.addingTimeInterval(0.2))
        }

        return condition()
    }
}
