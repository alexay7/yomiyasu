import SwiftUI

@MainActor
@Observable
final class HomeViewModel {
    private(set) var readingBooks: [Book] = []
    private(set) var tableroBooks: [Book] = []
    private(set) var readlaterManga: [Serie] = []
    private(set) var readlaterNovela: [Serie] = []
    private(set) var pausedManga: [Serie] = []
    private(set) var pausedNovela: [Serie] = []
    private(set) var newMangaBooks: [Book] = []
    private(set) var newNovelaBooks: [Book] = []
    private(set) var newMangaSeries: [Serie] = []
    private(set) var newNovelaSeries: [Serie] = []
    private(set) var recentMangaSeries: [Serie] = []
    private(set) var recentNovelaSeries: [Serie] = []

    private(set) var isLoading = false
    private(set) var error: String?

    func load(api: LibraryAPI, boards: BoardVisibility) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            async let reading: [Book] = boards.progress ? api.reading() : []
            async let tablero: [Book] = boards.tablero ? api.tablero() : []
            async let readlaterManga: [Serie] = boards.readLater
                ? api.readlist(variant: .manga) : []
            async let readlaterNovela: [Serie] = boards.readLater
                ? api.readlist(variant: .novela) : []
            async let pausedManga: [Serie] = boards.paused
                ? api.pausedSeries(variant: .manga) : []
            async let pausedNovela: [Serie] = boards.paused
                ? api.pausedSeries(variant: .novela) : []
            async let newMangaBooks: [Book] = boards.newBooks
                ? api.books(BooksQuery(variant: .manga, sort: .booksNewest, limit: 15)) : []
            async let newNovelaBooks: [Book] = boards.newBooks
                ? api.books(BooksQuery(variant: .novela, sort: .booksNewest, limit: 15)) : []
            async let newMangaSeries: [Serie] = boards.newSeries
                ? api.seriesList(SeriesQuery(variant: .manga, sort: .seriesNewest, limit: 15)) : []
            async let newNovelaSeries: [Serie] = boards.newSeries
                ? api.seriesList(SeriesQuery(variant: .novela, sort: .seriesNewest, limit: 15)) : []
            async let recentMangaSeries: [Serie] = boards.recentSeries
                ? api.seriesList(SeriesQuery(variant: .manga, sort: .seriesRecent, limit: 15)) : []
            async let recentNovelaSeries: [Serie] = boards.recentSeries
                ? api.seriesList(SeriesQuery(variant: .novela, sort: .seriesRecent, limit: 15)) : []

            let results = try await (
                reading,
                tablero,
                readlaterManga,
                readlaterNovela,
                newMangaBooks,
                newNovelaBooks,
                newMangaSeries,
                newNovelaSeries,
                recentMangaSeries,
                recentNovelaSeries,
                pausedManga,
                pausedNovela
            )

            readingBooks = boards.progress ? results.0 : []
            tableroBooks = boards.tablero ? results.1 : []
            self.readlaterManga = boards.readLater ? results.2 : []
            self.readlaterNovela = boards.readLater ? results.3 : []
            self.newMangaBooks = boards.newBooks ? results.4 : []
            self.newNovelaBooks = boards.newBooks ? results.5 : []
            self.newMangaSeries = boards.newSeries ? results.6 : []
            self.newNovelaSeries = boards.newSeries ? results.7 : []
            self.recentMangaSeries = boards.recentSeries ? results.8 : []
            self.recentNovelaSeries = boards.recentSeries ? results.9 : []
            self.pausedManga = boards.paused ? results.10 : []
            self.pausedNovela = boards.paused ? results.11 : []
        } catch {
            self.error = error.localizedDescription
        }
    }

    func filtered(_ books: [Book], mainView: MainView) -> [Book] {
        switch mainView {
        case .manga: books.filter { $0.variant == .manga }
        case .novels: books.filter { $0.variant == .novela }
        case .both: books
        }
    }

    func filtered(_ series: [Serie], mainView: MainView) -> [Serie] {
        switch mainView {
        case .manga: series.filter { $0.variant == .manga }
        case .novels: series.filter { $0.variant == .novela }
        case .both: series
        }
    }

    var isEmpty: Bool {
        readingBooks.isEmpty && tableroBooks.isEmpty
            && readlaterManga.isEmpty && readlaterNovela.isEmpty
            && pausedManga.isEmpty && pausedNovela.isEmpty
            && newMangaBooks.isEmpty && newNovelaBooks.isEmpty
            && newMangaSeries.isEmpty && newNovelaSeries.isEmpty
            && recentMangaSeries.isEmpty && recentNovelaSeries.isEmpty
    }
}

struct HomeView: View {
    @Environment(AppEnvironment.self) private var environment

    @State private var model = HomeViewModel()
    @State private var searchPresented = false
    @State private var pushedSerie: SerieRoute? = HomeView.initialSerieRoute
    @State private var pushedBook: BookRoute? = HomeView.initialBookRoute

    private static var initialSerieRoute: SerieRoute? {
        #if DEBUG
        if let id = ProcessInfo.processInfo.environment["YOMIYASU_E2E_SERIE"], !id.isEmpty {
            return SerieRoute(id: id)
        }
        #endif
        return nil
    }

    private static var initialBookRoute: BookRoute? {
        #if DEBUG
        if let id = ProcessInfo.processInfo.environment["YOMIYASU_E2E_BOOK"], !id.isEmpty {
            return BookRoute(id: id)
        }
        #endif
        return nil
    }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 22) {
                if model.isLoading && model.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding(.top, 40)
                } else if let error = model.error {
                    ContentUnavailableView(
                        "No se pudo cargar",
                        systemImage: "wifi.exclamationmark",
                        description: Text(error)
                    )
                } else if model.isEmpty {
                    ContentUnavailableView(
                        "Tu biblioteca está vacía",
                        systemImage: "books.vertical",
                        description: Text("Añade contenido al servidor para empezar.")
                    )
                }

                let mainView = environment.settings.mainView
                let boards = environment.settings.boards

                if boards.progress {
                    progressSection(
                        title: "En progreso",
                        books: model.filtered(model.readingBooks, mainView: mainView)
                    )
                }

                if boards.tablero {
                    progressSection(
                        title: "Tu tablero",
                        books: model.filtered(model.tableroBooks, mainView: mainView)
                    )
                }

                if boards.readLater {
                    if mainView != .novels {
                        seriesSection(title: "Leer más tarde (manga)", series: model.readlaterManga)
                    }
                    if mainView != .manga {
                        seriesSection(title: "Leer más tarde (novelas)", series: model.readlaterNovela)
                    }
                }

                if boards.paused {
                    if mainView != .novels {
                        seriesSection(title: "Pausadas (manga)", series: model.pausedManga)
                    }
                    if mainView != .manga {
                        seriesSection(title: "Pausadas (novelas)", series: model.pausedNovela)
                    }
                }

                if boards.newBooks {
                    if mainView != .novels {
                        booksSection(title: "Mangas nuevos", books: model.newMangaBooks)
                    }
                    if mainView != .manga {
                        booksSection(title: "Novelas nuevas", books: model.newNovelaBooks)
                    }
                }

                if boards.newSeries {
                    if mainView != .novels {
                        seriesSection(title: "Series de manga nuevas", series: model.newMangaSeries)
                    }
                    if mainView != .manga {
                        seriesSection(title: "Series de novelas nuevas", series: model.newNovelaSeries)
                    }
                }

                if boards.recentSeries {
                    if mainView != .novels {
                        seriesSection(
                            title: "Series de manga con volúmenes nuevos",
                            series: model.recentMangaSeries
                        )
                    }
                    if mainView != .manga {
                        seriesSection(
                            title: "Series de novelas con volúmenes nuevos",
                            series: model.recentNovelaSeries
                        )
                    }
                }
            }
            .padding(.vertical)
        }
        .navigationTitle("Yomiyasu")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Buscar", systemImage: "magnifyingglass") {
                    searchPresented = true
                }
            }
        }
        .navigationDestination(isPresented: $searchPresented) {
            SearchView()
        }
        .navigationDestination(item: $pushedSerie) { route in
            SerieView(serieId: route.id)
        }
        .navigationDestination(item: $pushedBook) { route in
            BookReaderView(bookId: route.id)
        }
        .task {
            await model.load(api: environment.library, boards: environment.settings.boards)
        }
        .onChange(of: environment.socket.libraryUpdatedAt) {
            Task { await model.load(api: environment.library, boards: environment.settings.boards) }
        }
        .onChange(of: environment.settings.mainView) {
            Task { await model.load(api: environment.library, boards: environment.settings.boards) }
        }
        .onChange(of: environment.settings.boards) {
            Task { await model.load(api: environment.library, boards: environment.settings.boards) }
        }
        .refreshable {
            await model.load(api: environment.library, boards: environment.settings.boards)
        }
    }

    @ViewBuilder
    private func progressSection(title: String, books: [Book]) -> some View {
        if !books.isEmpty {
            HomeScroller(title: title) {
                ForEach(books) { book in
                    NavigationLink(value: BookRoute(id: book.id)) {
                        BookCard(book: book)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    @ViewBuilder
    private func seriesSection(title: String, series: [Serie]) -> some View {
        if !series.isEmpty {
            HomeScroller(title: title) {
                ForEach(series) { serie in
                    NavigationLink(value: SerieRoute(id: serie.id)) {
                        SerieCard(serie: serie)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    @ViewBuilder
    private func booksSection(title: String, books: [Book]) -> some View {
        if !books.isEmpty {
            HomeScroller(title: title) {
                ForEach(books) { book in
                    NavigationLink(value: BookRoute(id: book.id)) {
                        BookCard(book: book)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}
