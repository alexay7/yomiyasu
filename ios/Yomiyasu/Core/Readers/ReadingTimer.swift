import Foundation
import Observation

@MainActor
@Observable
final class ReadingTimer {
    private(set) var seconds: Int = 0
    private(set) var isRunning = false

    private var lastTick: Date?
    private var tickTask: Task<Void, Never>?

    func start() {
        guard !isRunning else { return }
        isRunning = true
        lastTick = .now
        tickTask?.cancel()
        tickTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                guard !Task.isCancelled else { break }
                self?.tick()
            }
        }
    }

    func pause() {
        tick()
        isRunning = false
        tickTask?.cancel()
        tickTask = nil
        lastTick = nil
    }

    func resume(from seconds: Int) {
        self.seconds = max(0, seconds)
        lastTick = nil
    }

    func reset() {
        pause()
        seconds = 0
    }

    func add(minutes: Int) {
        seconds = max(0, seconds + minutes * 60)
    }

    var formatted: String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        let secs = seconds % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, secs)
        }

        return String(format: "%02d:%02d", minutes, secs)
    }

    private func tick() {
        guard let lastTick else { return }
        let delta = Int(Date.now.timeIntervalSince(lastTick))
        self.lastTick = .now
        seconds += max(0, delta)
    }
}
