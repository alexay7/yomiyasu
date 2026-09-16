import Foundation
import SwiftUI

struct SerieRoute: Hashable {
    let id: String
    var randomVariant: LibraryVariant?
}

struct BookRoute: Hashable {
    let id: String
}

enum AppSection: String, CaseIterable, Identifiable, Hashable {
    case home
    case library
    case readlist
    case words
    case history
    case calendar
    case stats
    case downloads
    case settings

    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: "Inicio"
        case .library: "Biblioteca"
        case .readlist: "Lista de lectura"
        case .words: "Palabras"
        case .history: "Historial"
        case .calendar: "Calendario"
        case .stats: "Estadísticas"
        case .downloads: "Descargas"
        case .settings: "Ajustes"
        }
    }

    var systemImage: String {
        switch self {
        case .home: "house"
        case .library: "books.vertical"
        case .readlist: "bookmark"
        case .words: "character.book.closed"
        case .history: "clock"
        case .calendar: "calendar"
        case .stats: "chart.bar"
        case .downloads: "arrow.down.circle"
        case .settings: "gearshape"
        }
    }
}

struct PlaceholderSectionView: View {
    let section: AppSection

    var body: some View {
        ContentUnavailableView(
            section.title,
            systemImage: section.systemImage,
            description: Text("Próximamente.")
        )
        .navigationTitle(section.title)
    }
}

struct MainShellView: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    var body: some View {
        if horizontalSizeClass == .regular {
            RegularShellView()
        } else {
            CompactShellView()
        }
    }
}

private enum CompactTab: Hashable {
    case home
    case library
    case readlist
    case words
    case more
}

private struct CompactShellView: View {
    @State private var selection: CompactTab = CompactShellView.initialSelection

    private static var initialSelection: CompactTab {
        #if DEBUG
        switch ProcessInfo.processInfo.environment["YOMIYASU_E2E_SECTION"] {
        case "library": return .library
        case "readlist": return .readlist
        case "words": return .words
        case "more": return .more
        default: return .home
        }
        #else
        return .home
        #endif
    }

    var body: some View {
        TabView(selection: $selection) {
            Tab("Inicio", systemImage: "house", value: CompactTab.home) {
                NavigationStack {
                    HomeView()
                        .libraryNavigation()
                }
            }
            Tab("Biblioteca", systemImage: "books.vertical", value: CompactTab.library) {
                NavigationStack {
                    LibraryView()
                        .libraryNavigation()
                }
            }
            Tab("Lista", systemImage: "bookmark", value: CompactTab.readlist) {
                NavigationStack {
                    ReadlistView()
                        .libraryNavigation()
                }
            }
            Tab("Palabras", systemImage: "character.book.closed", value: CompactTab.words) {
                NavigationStack {
                    WordsView()
                }
            }
            Tab("Más", systemImage: "ellipsis", value: CompactTab.more) {
                NavigationStack {
                    MoreView()
                }
            }
        }
    }
}

private struct RegularShellView: View {
    @State private var selection: AppSection? = RegularShellView.initialSelection

    private static var initialSelection: AppSection {
        #if DEBUG
        switch ProcessInfo.processInfo.environment["YOMIYASU_E2E_SECTION"] {
        case "library": return .library
        case "readlist": return .readlist
        case "words": return .words
        case "history": return .history
        case "calendar": return .calendar
        case "stats": return .stats
        case "downloads": return .downloads
        case "settings": return .settings
        default: return .home
        }
        #else
        return .home
        #endif
    }

    var body: some View {
        NavigationSplitView {
            List(selection: $selection) {
                Section {
                    sectionRow(.home)
                    sectionRow(.library)
                    sectionRow(.readlist)
                    sectionRow(.words)
                }
                Section {
                    sectionRow(.history)
                    sectionRow(.calendar)
                    sectionRow(.stats)
                    sectionRow(.downloads)
                }
                Section {
                    sectionRow(.settings)
                }
            }
            .navigationTitle("Yomiyasu")
        } detail: {
            NavigationStack {
                detailView(for: selection ?? .home)
                    .libraryNavigation()
            }
        }
    }

    private func sectionRow(_ section: AppSection) -> some View {
        Label(section.title, systemImage: section.systemImage)
            .tag(section)
    }

    @ViewBuilder
    private func detailView(for section: AppSection) -> some View {
        switch section {
        case .home:
            HomeView()
        case .library:
            LibraryView()
        case .readlist:
            ReadlistView()
        case .words:
            WordsView()
        case .downloads:
            DownloadsView()
        case .stats:
            StatsView()
        case .history:
            HistoryView()
        case .calendar:
            CalendarView()
        case .settings:
            SettingsView()
        }
    }
}

extension View {
    func libraryNavigation() -> some View {
        navigationDestination(for: SerieRoute.self) { route in
            SerieView(serieId: route.id, randomVariant: route.randomVariant)
        }
        .navigationDestination(for: BookRoute.self) { route in
            BookReaderView(bookId: route.id)
        }
    }
}
