import SwiftUI

@MainActor
@Observable
final class SerieViewModel {
    private(set) var serie: Serie?
    private(set) var books: [Book] = []
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var didLoad = false

    var actionError: String?

    func load(id: String, api: LibraryAPI) async {
        if !didLoad {
            isLoading = true
        }
        error = nil
        defer {
            isLoading = false
            didLoad = true
        }

        do {
            let detail = try await api.serieDetail(id: id)
            serie = detail

            let variant = LibraryVariant(rawValue: detail.variant?.rawValue ?? "") ?? .all
            books = try await api.books(
                BooksQuery(variant: variant, serie: id, sort: .booksDefault)
            )
        } catch {
            self.error = error.localizedDescription
        }
    }

    func toggleReadlist(api: LibraryAPI) async {
        guard let serie else { return }

        do {
            if serie.isInReadlist {
                try await api.removeFromReadlist(serieId: serie.id)
            } else {
                try await api.addToReadlist(serieId: serie.id)
            }
            await load(id: serie.id, api: api)
        } catch {
            actionError = error.localizedDescription
        }
    }

    func markRead(api: LibraryAPI) async {
        guard let serie else { return }

        do {
            try await api.markSerieRead(serieId: serie.id)
            await load(id: serie.id, api: api)
        } catch {
            actionError = error.localizedDescription
        }
    }

    func setPaused(_ paused: Bool, api: LibraryAPI) async {
        guard let serie else { return }

        do {
            try await api.setSeriePaused(paused, serieId: serie.id)
            await load(id: serie.id, api: api)
        } catch {
            actionError = error.localizedDescription
        }
    }

    func shouldBlur(index: Int) -> Bool {
        guard let serie else { return false }
        let readCount = books.count - serie.unreadCount
        return index >= readCount
    }

    var continueBook: Book? {
        books.last { $0.resolvedStatus == .reading } ?? books.first
    }

    var continueLabel: String {
        guard let serie else { return "Leer" }
        if serie.unreadCount == 0 { return "Leer de nuevo" }
        if serie.unreadCount == serie.totalBooks { return "Empezar a leer" }
        return "Seguir leyendo"
    }
}

struct SerieView: View {
    @Environment(AppEnvironment.self) private var environment

    let serieId: String
    let randomVariant: LibraryVariant?

    @State private var model = SerieViewModel()
    @State private var currentSerieId: String
    @State private var randomRollActive: Bool
    @State private var showingMarkRead = false
    @State private var summaryExpanded = false

    private let gridColumns = [GridItem(.adaptive(minimum: 100, maximum: 130), spacing: 14)]

    init(serieId: String, randomVariant: LibraryVariant? = nil) {
        self.serieId = serieId
        self.randomVariant = randomVariant
        _currentSerieId = State(initialValue: serieId)
        _randomRollActive = State(initialValue: randomVariant != nil)
    }

    var body: some View {
        ScrollView {
            if let serie = model.serie {
                VStack(alignment: .leading, spacing: 18) {
                    header(serie)

                    if !serie.plainSummary.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(serie.plainSummary)
                                .font(.callout)
                                .foregroundStyle(.secondary)
                                .lineLimit(summaryExpanded ? nil : 6)

                            Button(summaryExpanded ? "Ver menos" : "Ver más") {
                                withAnimation {
                                    summaryExpanded.toggle()
                                }
                            }
                            .font(.caption.bold())
                        }
                    }

                    if let book = model.continueBook {
                        NavigationLink(value: BookRoute(id: book.id)) {
                            Label(model.continueLabel, systemImage: "book.fill")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                    }

                    booksGrid(serie)

                    SerieSpeedSection(serieId: serie.id)

                    SerieReviewsSection(serieId: serie.id, reviews: serie.reviews ?? []) {
                        Task { await model.load(id: serieId, api: environment.library) }
                    }
                }
                .padding()
            } else if model.isLoading {
                ProgressView()
                    .padding(.top, 60)
            } else if let error = model.error {
                ContentUnavailableView(
                    "No se pudo cargar",
                    systemImage: "wifi.exclamationmark",
                    description: Text(error)
                )
            }
        }
        .navigationTitle(model.serie?.visibleName ?? "")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                actionsMenu
            }
        }
        .task(id: currentSerieId) {
            await model.load(id: currentSerieId, api: environment.library)
        }
        .onChange(of: environment.socket.libraryUpdatedAt) {
            Task { await model.load(id: currentSerieId, api: environment.library) }
        }
        .overlay(alignment: .bottomTrailing) {
            if randomRollActive {
                rerollControls
            }
        }
        .confirmationDialog(
            "¿Marcar toda la serie como leída?",
            isPresented: $showingMarkRead,
            titleVisibility: .visible
        ) {
            Button("Marcar como leída", role: .destructive) {
                Task { await model.markRead(api: environment.library) }
            }
        }
        .alert(
            "No se pudo completar la acción",
            isPresented: Binding(
                get: { model.actionError != nil },
                set: { if !$0 { model.actionError = nil } }
            )
        ) {
            Button("Vale", role: .cancel) {}
        } message: {
            Text(model.actionError ?? "")
        }
    }

    @ViewBuilder
    private var actionsMenu: some View {
        if let serie = model.serie {
            Menu {
                Button(
                    serie.isInReadlist ? "Quitar de la lista" : "Añadir a la lista",
                    systemImage: serie.isInReadlist ? "bookmark.slash" : "bookmark"
                ) {
                    Task { await model.toggleReadlist(api: environment.library) }
                }

                if serie.isPaused {
                    Button("Reanudar serie", systemImage: "play") {
                        Task { await model.setPaused(false, api: environment.library) }
                    }
                } else {
                    Button("Pausar serie", systemImage: "pause") {
                        Task { await model.setPaused(true, api: environment.library) }
                    }
                }

                if serie.unreadCount > 0 {
                    Button("Marcar serie como leída", systemImage: "checkmark.circle") {
                        showingMarkRead = true
                    }
                }

                Divider()

                downloadActions
            } label: {
                Image(systemName: "ellipsis.circle")
            }
        }
    }

    @ViewBuilder
    private var downloadActions: some View {
        let states = model.books.map { environment.downloads.state(for: $0.id) }
        let hasDownloaded = states.contains { if case .downloaded = $0 { true } else { false } }
        let hasPending = states.contains {
            switch $0 {
            case .notDownloaded, .failed: true
            default: false
            }
        }

        if hasPending {
            Button("Descargar serie", systemImage: "arrow.down.circle") {
                environment.downloads.enqueueSeries(model.books)
            }
        }

        if hasDownloaded {
            Button("Eliminar descargas", systemImage: "trash", role: .destructive) {
                for book in model.books where environment.downloads.isDownloaded(book.id) {
                    environment.downloads.delete(book.id)
                }
            }
        }
    }

    @ViewBuilder
    private func bookDownloadActions(_ book: Book) -> some View {
        switch environment.downloads.state(for: book.id) {
        case .downloaded:
            Button("Eliminar descarga", systemImage: "trash", role: .destructive) {
                environment.downloads.delete(book.id)
            }
        case .queued, .downloading:
            Button("Cancelar descarga", systemImage: "xmark.circle") {
                environment.downloads.cancel(book.id)
            }
        case .notDownloaded, .failed:
            Button("Descargar", systemImage: "arrow.down.circle") {
                environment.downloads.enqueue(book)
            }
        }
    }

    private var rerollControls: some View {
        HStack(spacing: 10) {
            Button {
                Task { await reroll() }
            } label: {
                Image(systemName: "dice")
                    .font(.title3)
                    .padding(12)
                    .background(Circle().fill(.ultraThinMaterial))
            }
            .accessibilityLabel("Tirar el dado otra vez")

            Button {
                withAnimation {
                    randomRollActive = false
                }
            } label: {
                Image(systemName: "xmark")
                    .font(.caption.bold())
                    .padding(9)
                    .background(Circle().fill(.ultraThinMaterial))
            }
            .accessibilityLabel("Cerrar dado")
        }
        .padding()
    }

    private func reroll() async {
        guard let randomVariant,
              let criteria = environment.randomCriteria.criteria(variant: randomVariant) else {
            return
        }

        let query = criteria.applying(to: SeriesQuery(variant: randomVariant))

        do {
            let serie = try await environment.library.randomSerie(query)
            currentSerieId = serie.id
        } catch {
            model.actionError = error.localizedDescription
        }
    }

    private func header(_ serie: Serie) -> some View {
        HStack(alignment: .top, spacing: 16) {
            RemoteImage(url: StaticURLs.serieCover(serie, baseURL: environment.api.baseURL))
                .frame(width: 130, height: 188)
                .clipShape(RoundedRectangle(cornerRadius: 12))

            VStack(alignment: .leading, spacing: 8) {
                if !serie.displayAuthors.isEmpty {
                    Text(serie.displayAuthors.joined(separator: ", "))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                HStack(spacing: 8) {
                    if let status = serie.status {
                        Text(status.title)
                            .font(.caption.bold())
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Capsule().fill(.quaternary))
                    }

                    if serie.isPaused {
                        Label("Pausada", systemImage: "pause.fill")
                            .font(.caption)
                            .foregroundStyle(.orange)
                    }
                }

                Label("\(serie.totalBooks) volúmenes · \(serie.unreadCount) sin leer", systemImage: "books.vertical")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                HStack(spacing: 6) {
                    DifficultyFlame(difficulty: serie.difficulty ?? 0)
                    Text((serie.difficulty ?? 0).formatted(.number.precision(.fractionLength(1))))
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if let valoration = serie.valoration, valoration > 0 {
                        StarRating(valoration: valoration)
                    }
                }

                if !serie.displayGenres.isEmpty {
                    Text(serie.displayGenres.joined(separator: " · "))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }

            Spacer(minLength: 0)
        }
    }

    @ViewBuilder
    private func booksGrid(_ serie: Serie) -> some View {
        if !model.books.isEmpty {
            Text("Volúmenes")
                .font(.headline)

            LazyVGrid(columns: gridColumns, spacing: 14) {
                ForEach(Array(model.books.enumerated()), id: \.element.id) { index, book in
                    NavigationLink(value: BookRoute(id: book.id)) {
                        BookCard(
                            book: book,
                            blurred: environment.settings.antispoilers && model.shouldBlur(index: index),
                            isDownloaded: environment.downloads.isDownloaded(book.id)
                        )
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        bookDownloadActions(book)
                    }
                }
            }
        }
    }
}
