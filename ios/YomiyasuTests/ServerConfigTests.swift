import XCTest

@testable import Yomiyasu

@MainActor
final class ServerConfigTests: XCTestCase {
    private var suiteName = ""
    private var defaults: UserDefaults!

    override func setUp() {
        super.setUp()
        suiteName = "es.manabe.yomiyasu.server-tests-\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suiteName)
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: suiteName)
        defaults = nil
        super.tearDown()
    }

    func testParseAddsHTTPSWhenSchemeIsMissing() {
        XCTAssertEqual(
            ServerConfig.parse("manga.example.com")?.absoluteString,
            "https://manga.example.com"
        )
        XCTAssertEqual(
            ServerConfig.parse("192.168.1.136:3001")?.absoluteString,
            "https://192.168.1.136:3001"
        )
    }

    func testParseKeepsHTTPAndDropsPathQueryAndFragment() {
        XCTAssertEqual(
            ServerConfig.parse("http://192.168.1.136:3001/api/static?x=1#top")?.absoluteString,
            "http://192.168.1.136:3001"
        )
        XCTAssertEqual(
            ServerConfig.parse("HTTPS://Example.Test/")?.absoluteString,
            "https://example.test"
        )
    }

    func testParseRejectsInvalidValues() {
        XCTAssertNil(ServerConfig.parse(""))
        XCTAssertNil(ServerConfig.parse("   "))
        XCTAssertNil(ServerConfig.parse("ftp://example.test"))
        XCTAssertNil(ServerConfig.parse("http://"))
        XCTAssertNil(ServerConfig.parse("https://foo bar"))
    }

    func testDefaultsHaveNoServerConfigured() {
        let config = ServerConfig(defaults: defaults, environment: [:])

        XCTAssertNil(config.baseURL)
        XCTAssertFalse(config.isConfigured)
    }

    func testSetServerPersistsAcrossInstances() {
        let config = ServerConfig(defaults: defaults, environment: [:])

        let url = config.setServer("http://192.168.1.136:3001")

        XCTAssertEqual(url?.absoluteString, "http://192.168.1.136:3001")
        XCTAssertTrue(config.isConfigured)

        let reloaded = ServerConfig(defaults: defaults, environment: [:])
        XCTAssertEqual(reloaded.baseURL?.absoluteString, "http://192.168.1.136:3001")
    }

    func testSetServerRejectsInvalidValueWithoutChangingCurrent() {
        let config = ServerConfig(defaults: defaults, environment: [:])
        config.setServer("https://valid.example.test")

        XCTAssertNil(config.setServer("no es una url"))
        XCTAssertEqual(config.baseURL?.absoluteString, "https://valid.example.test")
    }

    #if DEBUG
    func testEnvironmentOverrideWinsOverPersistedValue() {
        let config = ServerConfig(defaults: defaults, environment: [:])
        config.setServer("https://persisted.example.test")

        let overridden = ServerConfig(
            defaults: defaults,
            environment: ["YOMIYASU_SERVER_URL": "http://dev.example.test:3000"]
        )

        XCTAssertEqual(overridden.baseURL?.absoluteString, "http://dev.example.test:3000")

        let fallback = ServerConfig(
            defaults: defaults,
            environment: ["YOMIYASU_SERVER_URL": "not a url"]
        )

        XCTAssertEqual(fallback.baseURL?.absoluteString, "https://persisted.example.test")
    }
    #endif
}
