import CoreGraphics
import Foundation
import Observation

enum ZoomMode: String, CaseIterable, Identifiable, Codable {
    case fitScreen = "fit to screen"
    case fitWidth = "fit to width"
    case original = "original size"
    case keep = "keep zoom level"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .fitScreen: "Ajustar a pantalla"
        case .fitWidth: "Ajustar al ancho"
        case .original: "Tamaño original"
        case .keep: "Mantener zoom"
        }
    }
}

enum DictionaryLookupMode: String, CaseIterable, Identifiable, Codable {
    case word
    case sentence

    var id: String { rawValue }

    var title: String {
        switch self {
        case .word: "Palabra"
        case .sentence: "Frase"
        }
    }
}

enum ReaderFont: String, CaseIterable, Identifiable, Codable {
    case ipa
    case zenAntique
    case notoSansJP
    case system

    var id: String { rawValue }

    var title: String {
        switch self {
        case .ipa: "IPAex Gothic"
        case .zenAntique: "Zen Antique"
        case .notoSansJP: "Noto Sans JP"
        case .system: "Sistema"
        }
    }

    var fontName: String? {
        switch self {
        case .ipa: "IPAexGothic"
        case .zenAntique: "ZenAntique"
        case .notoSansJP: "NotoSansJP-Regular"
        case .system: nil
        }
    }
}

enum NovelWritingMode: String, CaseIterable, Identifiable, Codable {
    case automatic
    case horizontal
    case vertical

    var id: String { rawValue }

    var title: String {
        switch self {
        case .automatic: "Automático"
        case .horizontal: "Horizontal"
        case .vertical: "Vertical"
        }
    }
}

enum NovelTheme: String, CaseIterable, Identifiable, Codable {
    case system
    case light
    case dark
    case sepia

    var id: String { rawValue }

    var title: String {
        switch self {
        case .system: "Sistema"
        case .light: "Claro"
        case .dark: "Oscuro"
        case .sepia: "Sepia"
        }
    }
}

enum NovelFont: String, CaseIterable, Identifiable, Codable {
    case original
    case serif
    case sans

    var id: String { rawValue }

    var title: String {
        switch self {
        case .original: "Original"
        case .serif: "Serif"
        case .sans: "Sans"
        }
    }
}

@MainActor
@Observable
final class ReaderSettingsStore {
    private enum Key {
        static let r2l = "reader.r2l"
        static let doublePage = "reader.doublePage"
        static let hasCover = "reader.hasCover"
        static let defaultZoomMode = "reader.defaultZoomMode"
        static let displayOCR = "reader.displayOCR"
        static let textBoxBorders = "reader.textBoxBorders"
        static let fontSize = "reader.fontSize"
        static let toggleOCRTextBoxes = "reader.toggleOCRTextBoxes"
        static let panAndZoom = "reader.panAndZoom"
        static let nativeDictionary = "reader.nativeDictionary"
        static let dictionaryVersion = "reader.dictionaryVersion"
        static let scrollChange = "reader.scrollChange"
        static let font = "reader.font"
        static let novelWritingMode = "reader.novelWritingMode"
        static let novelTheme = "reader.novelTheme"
        static let novelFontSize = "reader.novelFontSize"
        static let novelFont = "reader.novelFont"
        static let novelScroll = "reader.novelScroll"
    }

    private let defaults: UserDefaults

    var r2l: Bool {
        didSet { defaults.set(r2l, forKey: Key.r2l) }
    }

    var doublePage: Bool {
        didSet { defaults.set(doublePage, forKey: Key.doublePage) }
    }

    var hasCover: Bool {
        didSet { defaults.set(hasCover, forKey: Key.hasCover) }
    }

    var defaultZoomMode: ZoomMode {
        didSet { defaults.set(defaultZoomMode.rawValue, forKey: Key.defaultZoomMode) }
    }

    var displayOCR: Bool {
        didSet { defaults.set(displayOCR, forKey: Key.displayOCR) }
    }

    var textBoxBorders: Bool {
        didSet { defaults.set(textBoxBorders, forKey: Key.textBoxBorders) }
    }

    var fontSize: Double {
        didSet { defaults.set(fontSize, forKey: Key.fontSize) }
    }

    var toggleOCRTextBoxes: Bool {
        didSet { defaults.set(toggleOCRTextBoxes, forKey: Key.toggleOCRTextBoxes) }
    }

    var panAndZoom: Bool {
        didSet { defaults.set(panAndZoom, forKey: Key.panAndZoom) }
    }

    var nativeDictionary: Bool {
        didSet { defaults.set(nativeDictionary, forKey: Key.nativeDictionary) }
    }

    var dictionaryVersion: DictionaryLookupMode {
        didSet { defaults.set(dictionaryVersion.rawValue, forKey: Key.dictionaryVersion) }
    }

    var scrollChange: Bool {
        didSet { defaults.set(scrollChange, forKey: Key.scrollChange) }
    }

    var font: ReaderFont {
        didSet { defaults.set(font.rawValue, forKey: Key.font) }
    }

    var novelWritingMode: NovelWritingMode {
        didSet { defaults.set(novelWritingMode.rawValue, forKey: Key.novelWritingMode) }
    }

    var novelTheme: NovelTheme {
        didSet { defaults.set(novelTheme.rawValue, forKey: Key.novelTheme) }
    }

    var novelFontSize: Double {
        didSet { defaults.set(novelFontSize, forKey: Key.novelFontSize) }
    }

    var novelFont: NovelFont {
        didSet { defaults.set(novelFont.rawValue, forKey: Key.novelFont) }
    }

    var novelScroll: Bool {
        didSet { defaults.set(novelScroll, forKey: Key.novelScroll) }
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults

        func bool(_ key: String, default defaultValue: Bool) -> Bool {
            defaults.object(forKey: key) as? Bool ?? defaultValue
        }

        r2l = bool(Key.r2l, default: true)
        doublePage = bool(Key.doublePage, default: true)
        hasCover = bool(Key.hasCover, default: true)
        displayOCR = bool(Key.displayOCR, default: false)
        textBoxBorders = bool(Key.textBoxBorders, default: false)
        toggleOCRTextBoxes = bool(Key.toggleOCRTextBoxes, default: true)
        panAndZoom = bool(Key.panAndZoom, default: true)
        nativeDictionary = bool(Key.nativeDictionary, default: true)
        scrollChange = bool(Key.scrollChange, default: true)
        defaultZoomMode = ZoomMode(
            rawValue: defaults.string(forKey: Key.defaultZoomMode) ?? ""
        ) ?? .fitScreen
        dictionaryVersion = DictionaryLookupMode(
            rawValue: defaults.string(forKey: Key.dictionaryVersion) ?? ""
        ) ?? .word
        font = ReaderFont(rawValue: defaults.string(forKey: Key.font) ?? "") ?? .ipa
        fontSize = defaults.double(forKey: Key.fontSize)

        novelWritingMode = NovelWritingMode(
            rawValue: defaults.string(forKey: Key.novelWritingMode) ?? ""
        ) ?? .automatic
        novelTheme = NovelTheme(
            rawValue: defaults.string(forKey: Key.novelTheme) ?? ""
        ) ?? .system
        novelFont = NovelFont(
            rawValue: defaults.string(forKey: Key.novelFont) ?? ""
        ) ?? .original
        novelFontSize = defaults.object(forKey: Key.novelFontSize) as? Double ?? 100
        novelScroll = bool(Key.novelScroll, default: false)
    }
}
