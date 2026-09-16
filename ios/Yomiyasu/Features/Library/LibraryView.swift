import SwiftUI

@MainActor
@Observable
final class LibraryViewModel {
    var variant: LibraryVariant = .all {
        didSet { query.variant = variant }
    }

    var query = SeriesQuery()

    private(set) var series: [Serie] = []
    private(set) var alphabet: [AlphabetGroup] = []
    private(set) var genres: [String] = []
    private(set) var authors: [String] = []
    private(set) var totalPages = 1
    private(set) var isLoading = false
    private(set) var isLoadingMore = false
    private(set) var error: String?
    private(set) var didLoad = false

    var actionError: String?

    var hasMore: Bool { query.page < totalPages }

    func setFirstLetter(_ letter: String?) {
        query.firstLetter = letter
    }

    func load(api: LibraryAPI, reset: Bool) async {
        query.variant = variant

        if reset {
            query.page = 1
            isLoading = true
        } else {
            guard !isLoadingMore, hasMore else { return }
            isLoadingMore = true
        }

        error = nil
        defer {
            isLoading = false
            isLoadingMore = false
            didLoad = true
        }

        do {
            let page = try await api.seriesPage(query)

            if reset {
                series = page.data
            } else {
                series.append(contentsOf: page.data)
            }
            totalPages = page.pages

            if reset {
                async let alphabet = api.alphabet(query)
                async let metadata = api.genresAndArtists()

                self.alphabet = try await alphabet
                let result = try await metadata
                genres = result.genres
                authors = result.authors
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadMore(api: LibraryAPI) async {
        guard hasMore, !isLoading, !isLoadingMore else { return }

        query.page += 1
        await load(api: api, reset: false)

        if error != nil {
            query.page -= 1
        }
    }

    func randomSerie(api: LibraryAPI) async -> Serie? {
        query.variant = variant

        do {
            return try await api.randomSerie(query)
        } catch {
            actionError = error.localizedDescription
            return nil
        }
    }
}

struct LibraryView: View {
    @Environment(AppEnvironment.self) private var environment

    @State private var model = LibraryViewModel()
    @State private var showingFilters = false
    @State private var searchPresented = false
    @State private var randomRoute: SerieRoute?

    private let columns = [GridItem(.adaptive(minimum: 100, maximum: 140), spacing: 12)]

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Picker("Variante", selection: $model.variant) {
                    ForEach(LibraryVariant.allCases) { variant in
                        Text(variant.title).tag(variant)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                content

                if model.isLoadingMore {
                    ProgressView()
                        .padding()
                }
            }
            .padding(.vertical)
        }
        .overlay(alignment: .trailing) {
            if !model.alphabet.isEmpty, !model.series.isEmpty {
                AlphabetIndex(
                    groups: model.alphabet,
                    selected: model.query.firstLetter
                ) { group in
                    model.setFirstLetter(group)
                    Task { await model.load(api: environment.library, reset: true) }
                }
                .padding(.trailing, 2)
            }
        }
        .navigationTitle("Biblioteca")
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button("Aleatorio", systemImage: "dice") {
                    Task { await pickRandom() }
                }

                Button("Filtros", systemImage: model.query.isFiltering ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle") {
                    showingFilters = true
                }

                Button("Buscar", systemImage: "magnifyingglass") {
                    searchPresented = true
                }
            }
        }
        .navigationDestination(isPresented: $searchPresented) {
            SearchView()
        }
        .navigationDestination(item: $randomRoute) { route in
            SerieView(serieId: route.id, randomVariant: route.randomVariant)
        }
        .sheet(isPresented: $showingFilters) {
            LibraryFiltersView(
                query: $model.query,
                genres: model.genres,
                authors: model.authors
            )
            .onDisappear {
                Task { await model.load(api: environment.library, reset: true) }
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
        .task {
            if !model.didLoad {
                model.variant = defaultVariant
                await model.load(api: environment.library, reset: true)
            }
        }
        .onChange(of: model.variant) {
            Task { await model.load(api: environment.library, reset: true) }
        }
        .onChange(of: environment.socket.libraryUpdatedAt) {
            Task { await model.load(api: environment.library, reset: true) }
        }
        .refreshable {
            await model.load(api: environment.library, reset: true)
        }
    }

    private var defaultVariant: LibraryVariant {
        switch environment.settings.mainView {
        case .manga: .manga
        case .novels: .novela
        case .both: .all
        }
    }

    @ViewBuilder
    private var content: some View {
        if model.isLoading && model.series.isEmpty {
            ProgressView()
                .padding(.top, 40)
        } else if let error = model.error, model.series.isEmpty {
            ContentUnavailableView(
                "No se pudo cargar",
                systemImage: "wifi.exclamationmark",
                description: Text(error)
            )
        } else if model.series.isEmpty {
            ContentUnavailableView(
                "Sin resultados",
                systemImage: "magnifyingglass",
                description: Text("Prueba a cambiar los filtros.")
            )
        } else {
            LazyVGrid(columns: columns, spacing: 14) {
                ForEach(model.series) { serie in
                    NavigationLink(value: SerieRoute(id: serie.id)) {
                        SerieCard(serie: serie)
                    }
                    .buttonStyle(.plain)
                    .onAppear {
                        if serie.id == model.series.last?.id {
                            Task { await model.loadMore(api: environment.library) }
                        }
                    }
                }
            }
            .padding(.leading)
            .padding(.trailing, 28)
        }
    }

    private func pickRandom() async {
        environment.randomCriteria.save(RandomCriteria(query: model.query), variant: model.variant)

        guard let serie = await model.randomSerie(api: environment.library) else { return }
        randomRoute = SerieRoute(id: serie.id, randomVariant: model.variant)
    }
}

struct AlphabetIndex: View {
    let groups: [AlphabetGroup]
    let selected: String?
    let onSelect: (String?) -> Void

    var body: some View {
        VStack(spacing: 0) {
            ForEach(groups) { group in
                let isSelected = group.group == (selected ?? "all")

                Button {
                    onSelect(group.group == "all" ? nil : group.group)
                } label: {
                    Text(group.displayName)
                        .font(.system(size: 9, weight: isSelected ? .bold : .regular))
                        .foregroundStyle(
                            group.count == 0
                                ? Color.secondary.opacity(0.35)
                                : (isSelected ? Color.accentColor : Color.primary)
                        )
                        .frame(width: 20, height: 17)
                }
                .disabled(group.count == 0)
            }
        }
    }
}
