import SwiftUI

struct BookReaderView: View {
    @Environment(AppEnvironment.self) private var environment

    let bookId: String

    @State private var route: Variant?
    @State private var isMokured = false
    @State private var error: String?

    var body: some View {
        Group {
            if let route {
                if route == .novela, !isMokured {
                    NovelReaderView(bookId: bookId)
                } else {
                    ReaderView(bookId: bookId)
                }
            } else if let error {
                ContentUnavailableView(
                    "No se pudo abrir",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            } else {
                ProgressView()
                    .task {
                        await load()
                    }
            }
        }
    }

    private func load() async {
        do {
            let book = try await environment.library.book(id: bookId)
            isMokured = book.isMokured
            route = book.variant ?? .manga
        } catch {
            self.error = error.localizedDescription
        }
    }
}
