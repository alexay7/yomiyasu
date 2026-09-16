import XCTest

@testable import Yomiyasu

final class ReadingTimerTests: XCTestCase {
    private var current = Date(timeIntervalSince1970: 1_000_000)

    @MainActor
    private func makeTimer() -> ReadingTimer {
        ReadingTimer(now: { [self] in current })
    }

    @MainActor
    func testIdleTimeoutPausesAfterInactivityAndActivityResumes() {
        let timer = makeTimer()
        timer.idleTimeoutMinutes = 5

        timer.start()
        timer.tick()
        XCTAssertTrue(timer.isRunning)

        current = current.addingTimeInterval(4 * 60)
        timer.tick()
        XCTAssertTrue(timer.isRunning)

        current = current.addingTimeInterval(60)
        timer.tick()
        XCTAssertFalse(timer.isRunning)

        timer.notifyActivity()
        timer.tick()
        XCTAssertTrue(timer.isRunning)

        current = current.addingTimeInterval(4 * 60)
        timer.tick()
        XCTAssertTrue(timer.isRunning)

        current = current.addingTimeInterval(60)
        timer.tick()
        XCTAssertFalse(timer.isRunning)
    }

    @MainActor
    func testManualPauseDoesNotAutoResume() {
        let timer = makeTimer()
        timer.idleTimeoutMinutes = 5

        timer.start()
        timer.tick()
        timer.pause()

        XCTAssertFalse(timer.isRunning)

        current = current.addingTimeInterval(60 * 60)
        timer.tick()
        XCTAssertFalse(timer.isRunning)

        timer.notifyActivity()
        XCTAssertFalse(timer.isRunning)
    }

    @MainActor
    func testResumingManuallyRestartsIdleClock() {
        let timer = makeTimer()
        timer.idleTimeoutMinutes = 5

        timer.start()
        timer.tick()

        current = current.addingTimeInterval(5 * 60)
        timer.tick()
        XCTAssertFalse(timer.isRunning)

        timer.start()
        timer.tick()

        current = current.addingTimeInterval(4 * 60)
        timer.tick()
        XCTAssertTrue(timer.isRunning)

        current = current.addingTimeInterval(60)
        timer.tick()
        XCTAssertFalse(timer.isRunning)
    }

    @MainActor
    func testIdleTimeoutZeroDisablesAutoPause() {
        let timer = makeTimer()
        timer.idleTimeoutMinutes = 0

        timer.start()
        timer.tick()

        current = current.addingTimeInterval(60 * 60)
        timer.tick()
        XCTAssertTrue(timer.isRunning)
    }
}
