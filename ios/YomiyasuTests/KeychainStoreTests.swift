import XCTest

@testable import Yomiyasu

final class KeychainStoreTests: XCTestCase {
    func testRoundTrip() {
        let store = KeychainStore(service: "es.manabe.yomiyasu.tests")
        let key = "test-key-\(UUID().uuidString)"
        defer { store.remove(key) }

        XCTAssertNil(store.string(for: key))

        store.set("value", for: key)
        XCTAssertEqual(store.string(for: key), "value")

        store.set("value-2", for: key)
        XCTAssertEqual(store.string(for: key), "value-2")

        store.remove(key)
        XCTAssertNil(store.string(for: key))
    }
}
