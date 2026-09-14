import XCTest

@testable import Yomiyasu

@MainActor
final class SocketServiceTests: XCTestCase {
    func testLibraryUpdateNotificationUpdatesTimestamp() {
        let service = SocketService(url: URL(string: "https://example.test")!)
        XCTAssertNil(service.libraryUpdatedAt)

        service.handleNotification([["action": "LIBRARY_UPDATE"]])

        XCTAssertNotNil(service.libraryUpdatedAt)
    }

    func testUnknownNotificationIsIgnored() {
        let service = SocketService(url: URL(string: "https://example.test")!)

        service.handleNotification([["action": "OTHER_EVENT"]])

        XCTAssertNil(service.libraryUpdatedAt)
    }

    func testMalformedNotificationIsIgnored() {
        let service = SocketService(url: URL(string: "https://example.test")!)

        service.handleNotification(["not a dictionary"])
        service.handleNotification([[:]])
        service.handleNotification([])

        XCTAssertNil(service.libraryUpdatedAt)
    }
}
