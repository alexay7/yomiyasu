import Foundation
import Observation

@MainActor
@Observable
final class ReadingTimer {
    private(set) var seconds: Int = 0
    private(set) var isRunning = false

    /// Minutos sin actividad de lectura tras los que se pausa el cronómetro. 0 lo desactiva.
    var idleTimeoutMinutes: Int = 0

    private var lastTick: Date?
    private var tickTask: Task<Void, Never>?
    private var lastActivity: Date
    private var idlePaused = false
    private var wasRunning = false

    private let now: () -> Date

    init(now: @escaping () -> Date = { .now }) {
        self.now = now
        lastActivity = now()
    }

    func start() {
        guard !isRunning else { return }
        isRunning = true
        lastTick = now()
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
        flushSeconds()
        isRunning = false
        wasRunning = false
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

    /// Registra actividad de lectura y reanuda el cronómetro si se pausó por inactividad.
    func notifyActivity() {
        lastActivity = now()

        if idlePaused {
            idlePaused = false
            start()
        }
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

    func tick() {
        flushSeconds()
        evaluateIdle()
    }

    private func flushSeconds() {
        guard let lastTick else { return }
        let delta = Int(now().timeIntervalSince(lastTick))
        self.lastTick = now()
        seconds += max(0, delta)
    }

    private func evaluateIdle() {
        guard idleTimeoutMinutes > 0 else { return }

        // Reanudación (manual o automática): el tiempo de inactividad cuenta de nuevo
        if isRunning && !wasRunning {
            lastActivity = now()
            idlePaused = false
        }

        wasRunning = isRunning

        if isRunning && !idlePaused
            && now().timeIntervalSince(lastActivity) >= Double(idleTimeoutMinutes) * 60 {
            idlePaused = true
            pause()
        }
    }
}
