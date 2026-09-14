import UIKit
import XCTest

@testable import Yomiyasu

final class ReaderPagerDirectionTests: XCTestCase {
    func testRTLForwardGoesToNextPageAnimatingContentRightwards() {
        XCTAssertEqual(
            ReaderPagerController.navigationDirection(from: 3, to: 4, r2l: true),
            .reverse
        )
    }

    func testRTLBackwardGoesToPreviousPageAnimatingContentLeftwards() {
        XCTAssertEqual(
            ReaderPagerController.navigationDirection(from: 3, to: 2, r2l: true),
            .forward
        )
    }

    func testLTRForwardKeepsStandardAnimation() {
        XCTAssertEqual(
            ReaderPagerController.navigationDirection(from: 3, to: 4, r2l: false),
            .forward
        )
    }

    func testLTRBackwardKeepsStandardAnimation() {
        XCTAssertEqual(
            ReaderPagerController.navigationDirection(from: 3, to: 2, r2l: false),
            .reverse
        )
    }
}
