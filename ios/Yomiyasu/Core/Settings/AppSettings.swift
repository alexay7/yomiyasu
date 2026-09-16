import Foundation
import Observation
import SwiftUI

enum AppAppearance: String, CaseIterable, Identifiable, Codable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var title: String {
        switch self {
        case .system: "Sistema"
        case .light: "Claro"
        case .dark: "Oscuro"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }
}

enum BookViewMode: String, CaseIterable, Identifiable, Codable {
    case characters
    case pages
    case both
    case remainingCharacters
    case remainingPages
    case remainingTime

    var id: String { rawValue }

    var title: String {
        switch self {
        case .characters: "Caracteres"
        case .pages: "Páginas"
        case .both: "Ambos"
        case .remainingCharacters: "Caracteres restantes"
        case .remainingPages: "Páginas restantes"
        case .remainingTime: "Tiempo restante"
        }
    }
}

struct BoardVisibility: Equatable, Sendable {
    var progress = true
    var tablero = true
    var readLater = true
    var paused = false
    var newBooks = true
    var newSeries = true
    var recentSeries = true
}

@MainActor
@Observable
final class AppSettings {
    private enum Key {
        static let mainView = "mainView"
        static let antispoilers = "antispoilers"
        static let appearance = "appearance"
        static let autoCrono = "autoCrono"
        static let showCrono = "showCrono"
        static let bookView = "bookView"
        static let meanSpeed = "meanSpeed"
        static let idleTimeout = "idleTimeout"
        static let boardProgress = "boardProgress"
        static let boardTablero = "boardTablero"
        static let boardReadLater = "boardReadLater"
        static let boardPaused = "boardPaused"
        static let boardNewBooks = "boardNewBooks"
        static let boardNewSeries = "boardNewSeries"
        static let boardRecentSeries = "boardRecentSeries"
    }

    private let defaults: UserDefaults

    var mainView: MainView {
        didSet { defaults.set(mainView.rawValue, forKey: Key.mainView) }
    }

    var antispoilers: Bool {
        didSet { defaults.set(antispoilers, forKey: Key.antispoilers) }
    }

    var appearance: AppAppearance {
        didSet { defaults.set(appearance.rawValue, forKey: Key.appearance) }
    }

    var autoCrono: Bool {
        didSet { defaults.set(autoCrono, forKey: Key.autoCrono) }
    }

    var showCrono: Bool {
        didSet { defaults.set(showCrono, forKey: Key.showCrono) }
    }

    var bookView: BookViewMode {
        didSet { defaults.set(bookView.rawValue, forKey: Key.bookView) }
    }

    var meanCharactersPerHour: Double? {
        didSet {
            if let meanCharactersPerHour {
                defaults.set(meanCharactersPerHour, forKey: Key.meanSpeed)
            } else {
                defaults.removeObject(forKey: Key.meanSpeed)
            }
        }
    }

    var boards: BoardVisibility {
        didSet { persistBoards() }
    }

    /// Minutos sin actividad de lectura tras los que se pausa el cronómetro. 0 lo desactiva.
    var idleTimeout: Int {
        didSet { defaults.set(idleTimeout, forKey: Key.idleTimeout) }
    }

    private func persistBoards() {
        defaults.set(boards.progress, forKey: Key.boardProgress)
        defaults.set(boards.tablero, forKey: Key.boardTablero)
        defaults.set(boards.readLater, forKey: Key.boardReadLater)
        defaults.set(boards.paused, forKey: Key.boardPaused)
        defaults.set(boards.newBooks, forKey: Key.boardNewBooks)
        defaults.set(boards.newSeries, forKey: Key.boardNewSeries)
        defaults.set(boards.recentSeries, forKey: Key.boardRecentSeries)
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        mainView = MainView(rawValue: defaults.string(forKey: Key.mainView) ?? "") ?? .both
        antispoilers = defaults.bool(forKey: Key.antispoilers)
        appearance = AppAppearance(
            rawValue: defaults.string(forKey: Key.appearance) ?? ""
        ) ?? .dark
        autoCrono = defaults.bool(forKey: Key.autoCrono)
        showCrono = defaults.object(forKey: Key.showCrono) as? Bool ?? true
        bookView = BookViewMode(
            rawValue: defaults.string(forKey: Key.bookView) ?? ""
        ) ?? .characters
        meanCharactersPerHour = defaults.object(forKey: Key.meanSpeed) as? Double
        idleTimeout = defaults.object(forKey: Key.idleTimeout) as? Int ?? 0
        boards = BoardVisibility(
            progress: defaults.object(forKey: Key.boardProgress) as? Bool ?? true,
            tablero: defaults.object(forKey: Key.boardTablero) as? Bool ?? true,
            readLater: defaults.object(forKey: Key.boardReadLater) as? Bool ?? true,
            paused: defaults.object(forKey: Key.boardPaused) as? Bool ?? false,
            newBooks: defaults.object(forKey: Key.boardNewBooks) as? Bool ?? true,
            newSeries: defaults.object(forKey: Key.boardNewSeries) as? Bool ?? true,
            recentSeries: defaults.object(forKey: Key.boardRecentSeries) as? Bool ?? true
        )
    }
}
