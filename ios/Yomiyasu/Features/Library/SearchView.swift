import SwiftUI

struct SearchView: View {
    @Environment(AppEnvironment.self) private var environment

    @State private var queryText = ""
    @State private var seriesResults: [Serie] = []
    @State private var bookResults: [Book] = []
    @State private var isSearching = false
    @State private var searchTask: Task<Void, Never>?
    @State private var error: String?

    var body: some View {
        List {
            if isSearching && seriesResults.isEmpty && bookResults.isEmpty {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
            }

            if let error, seriesResults.isEmpty, bookResults.isEmpty {
                Text(error)
                    .foregroundStyle(.red)
            }

            if !seriesResults.isEmpty {
                Section("Series") {
                    ForEach(seriesResults) { serie in
                        NavigationLink(value: SerieRoute(id: serie.id)) {
                            SerieRow(serie: serie)
                        }
                    }
                }
            }

            if !bookResults.isEmpty {
                Section("Libros") {
                    ForEach(bookResults) { book in
                        NavigationLink(value: BookRoute(id: book.id)) {
                            BookRow(book: book)
                        }
                    }
                }
            }
        }
        .searchable(text: $queryText, prompt: "Series y libros (mínimo 2 letras)")
        .onChange(of: queryText) {
            scheduleSearch()
        }
        .navigationTitle("Buscar")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func scheduleSearch() {
        searchTask?.cancel()

        let text = queryText.trimmingCharacters(in: .whitespaces)

        guard text.count >= 2 else {
            seriesResults = []
            bookResults = []
            isSearching = false
            return
        }

        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }
            await performSearch(text)
        }
    }

    private func performSearch(_ text: String) async {
        isSearching = true
        error = nil
        defer { isSearching = false }

        async let seriesRequest = environment.library.seriesList(
            SeriesQuery(variant: .all, name: text, sort: .seriesDefault, limit: 25)
        )
        async let booksRequest = environment.library.books(
            BooksQuery(variant: .all, name: text, sort: .booksDefault, limit: 10)
        )

        do {
            let (series, books) = try await (seriesRequest, booksRequest)
            seriesResults = series.sorted { lhs, rhs in
                lhs.variant == rhs.variant ? false : lhs.variant == .manga
            }
            bookResults = books.sorted { lhs, rhs in
                lhs.variant == rhs.variant ? false : lhs.variant == .manga
            }
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private struct SerieRow: View {
    @Environment(AppEnvironment.self) private var environment

    let serie: Serie

    var body: some View {
        HStack(spacing: 12) {
            RemoteImage(url: StaticURLs.serieCover(serie, baseURL: environment.api.baseURL))
                .frame(width: 40, height: 58)
                .clipShape(RoundedRectangle(cornerRadius: 4))

            VStack(alignment: .leading, spacing: 3) {
                Text(serie.visibleName)
                    .lineLimit(2)
                Text("\((serie.variant ?? .manga).title) · \(serie.totalBooks) volúmenes")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

private struct BookRow: View {
    @Environment(AppEnvironment.self) private var environment

    let book: Book

    var body: some View {
        HStack(spacing: 12) {
            RemoteImage(url: StaticURLs.bookCover(book, baseURL: environment.api.baseURL))
                .frame(width: 40, height: 58)
                .clipShape(RoundedRectangle(cornerRadius: 4))

            VStack(alignment: .leading, spacing: 3) {
                Text(book.visibleName)
                    .lineLimit(2)
                Text((book.variant ?? .manga).title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}
