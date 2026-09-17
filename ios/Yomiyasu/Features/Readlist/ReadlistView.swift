import SwiftUI

struct ReadlistView: View {
    @Environment(AppEnvironment.self) private var environment

    @State private var manga: [Serie] = []
    @State private var novela: [Serie] = []
    @State private var isLoading = true
    @State private var error: String?

    private let columns = [GridItem(.adaptive(minimum: 112, maximum: 150), spacing: 14)]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if isLoading && manga.isEmpty && novela.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding(.top, 40)
                } else if let error, manga.isEmpty, novela.isEmpty {
                    ContentUnavailableView(
                        "No se pudo cargar",
                        systemImage: "wifi.exclamationmark",
                        description: Text(error)
                    )
                } else if visibleManga.isEmpty && visibleNovela.isEmpty {
                    ContentUnavailableView(
                        "Tu lista está vacía",
                        systemImage: "bookmark",
                        description: Text("Añade series desde su ficha para leerlas más tarde.")
                    )
                }

                section(title: "Manga", series: visibleManga)
                section(title: "Novelas", series: visibleNovela)
            }
            .padding(.vertical)
        }
        .navigationTitle("Lista de lectura")
        .task {
            await load()
        }
        .onChange(of: environment.socket.libraryUpdatedAt) {
            Task { await load() }
        }
        .onChange(of: environment.settings.mainView) {
            Task { await load() }
        }
        .refreshable {
            await load()
        }
    }

    private var visibleManga: [Serie] {
        environment.settings.mainView == .novels ? [] : manga
    }

    private var visibleNovela: [Serie] {
        environment.settings.mainView == .manga ? [] : novela
    }

    @ViewBuilder
    private func section(title: String, series: [Serie]) -> some View {
        if !series.isEmpty {
            Text(title)
                .font(.headline)
                .padding(.horizontal)

            LazyVGrid(columns: columns, spacing: 14) {
                ForEach(series) { serie in
                    NavigationLink(value: SerieRoute(id: serie.id)) {
                        SerieCard(serie: serie, width: nil)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
        }
    }

    private func load() async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            async let manga = environment.library.readlist(variant: .manga)
            async let novela = environment.library.readlist(variant: .novela)

            self.manga = try await manga
            self.novela = try await novela
        } catch {
            self.error = error.localizedDescription
        }
    }
}
