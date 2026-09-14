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
    }
}
