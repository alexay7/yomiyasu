import SwiftUI

struct BookCard: View {
    @Environment(AppEnvironment.self) private var environment

    let book: Book
    var width: CGFloat = 110
    var blurred = false
    var isDownloaded = false

    @State private var showingMarkReadDialog = false
    @State private var actionError: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            ZStack(alignment: .topLeading) {
                RemoteImage(url: StaticURLs.bookCover(book, baseURL: environment.api.baseURL))
                    .frame(width: width, height: width * 1.45)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .blur(radius: blurred ? 10 : 0)

                if book.resolvedStatus == .unread {
                    UnreadTriangle()
                }

                if book.isMokured {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.caption2)
                        .foregroundStyle(.yellow)
                        .padding(4)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                }

                if isDownloaded {
                    Image(systemName: "arrow.down.circle.fill")
                        .font(.caption)
                        .foregroundStyle(.white, Color.accentColor)
                        .padding(4)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
                        .accessibilityLabel("Descargado")
                }
            }

            if book.resolvedStatus != .unread {
                ProgressView(value: book.progressFraction)
                    .frame(width: width)
            }

            Text(book.visibleName)
                .font(.caption2)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
                .frame(width: width, alignment: .leading)

            if let infoText {
                Text(infoText)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .frame(width: width, alignment: .leading)
            }
        }
        .contextMenu {
            menuItems
        }
        .confirmationDialog(
            "¿Hasta qué página marcar como leído?",
            isPresented: $showingMarkReadDialog,
            titleVisibility: .visible
        ) {
            markReadDialogButtons
        }
        .alert(
            "Error",
            isPresented: Binding(
                get: { actionError != nil },
                set: { if !$0 { actionError = nil } }
            ),
            presenting: actionError
        ) { _ in
            Button("Vale", role: .cancel) {}
        } message: { message in
            Text(message)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("bookCard-\(book.id)")
    }

    // MARK: - Menú contextual

    @ViewBuilder
    private var menuItems: some View {
        if let serieId = book.serie {
            NavigationLink(value: SerieRoute(id: serieId)) {
                Label("Ir a la serie", systemImage: "books.vertical")
            }
        }

        if book.resolvedStatus != .completed {
            Button {
                markRead()
            } label: {
                Label("Marcar como leído", systemImage: "checkmark.circle")
            }
        }

        if book.resolvedStatus == .completed {
            Button {
                markUnread()
            } label: {
                Label("Marcar como no leído", systemImage: "arrow.uturn.backward.circle")
            }
        } else if book.resolvedStatus == .reading {
            Button(role: .destructive) {
                markUnread()
            } label: {
                Label("Eliminar progreso actual", systemImage: "trash")
            }
        }

        if let serieId = book.serie {
            Button {
                toggleReadlist(serieId: serieId)
            } label: {
                Label(
                    isInReadlist ? "Quitar serie de Leer más tarde" : "Añadir serie a Leer más tarde",
                    systemImage: isInReadlist ? "bookmark.slash" : "bookmark"
                )
            }
        }

        if canDownload {
            Button {
                environment.downloads.enqueue(book)
            } label: {
                Label("Descargar", systemImage: "arrow.down.circle")
            }
        }
    }

    @ViewBuilder
    private var markReadDialogButtons: some View {
        let currentPage = book.lastProgress?.currentPage ?? 0

        if currentPage > 0 {
            Button("Página \(currentPage)") {
                markCompleted(currentPage: currentPage, characters: book.lastProgress?.characters)
            }
        }

        if let pages = book.pages, pages > 0 {
            Button("Última página (\(pages))") {
                markCompleted(currentPage: pages, characters: book.characters)
            }
        }

        Button("Cancelar", role: .cancel) {}
    }

    // MARK: - Estado

    private var isInReadlist: Bool {
        book.readlist?.isInReadlist ?? false
    }

    private var canDownload: Bool {
        switch environment.downloads.state(for: book.id) {
        case .notDownloaded, .failed:
            true
        default:
            false
        }
    }

    // MARK: - Acciones

    private func markRead() {
        if book.resolvedStatus == .reading,
           let currentPage = book.lastProgress?.currentPage,
           currentPage > 0 {
            showingMarkReadDialog = true
            return
        }

        markCompleted(currentPage: nil, characters: nil)
    }

    private func markCompleted(currentPage: Int?, characters: Int?) {
        Task {
            do {
                try await environment.progress.markCompleted(
                    book,
                    currentPage: currentPage,
                    characters: characters
                )
                environment.socket.markLibraryUpdated()
            } catch {
                actionError = error.localizedDescription
            }
        }
    }

    private func markUnread() {
        Task {
            do {
                try await environment.progress.markUnread(book)
                environment.socket.markLibraryUpdated()
            } catch {
                actionError = error.localizedDescription
            }
        }
    }

    private func toggleReadlist(serieId: String) {
        Task {
            do {
                if isInReadlist {
                    try await environment.library.removeFromReadlist(serieId: serieId)
                } else {
                    try await environment.library.addToReadlist(serieId: serieId)
                }
                environment.socket.markLibraryUpdated()
            } catch {
                actionError = error.localizedDescription
            }
        }
    }

    private var infoText: String? {
        let characters = book.characters ?? 0
        let pages = book.pages ?? 0
        let readCharacters = book.lastProgress?.characters ?? 0
        let currentPage = book.lastProgress?.currentPage ?? 1

        switch environment.settings.bookView {
        case .characters:
            return characters > 0 ? "\(characters.formatted()) car." : nil
        case .pages:
            return pages > 0 ? "\(pages) pág." : nil
        case .both:
            var parts: [String] = []
            if characters > 0 { parts.append("\(characters.formatted()) car.") }
            if pages > 0 { parts.append("\(pages) pág.") }
            return parts.isEmpty ? nil : parts.joined(separator: " · ")
        case .remainingCharacters:
            let remaining = max(characters - readCharacters, 0)
            return characters > 0 ? "Quedan \(remaining.formatted()) car." : nil
        case .remainingPages:
            let remaining = max(pages - currentPage, 0)
            return pages > 0 ? "Quedan \(remaining) pág." : nil
        case .remainingTime:
            guard characters > 0, let speed = environment.settings.meanCharactersPerHour, speed > 0 else {
                return nil
            }

            let remaining = max(characters - readCharacters, 0)
            let seconds = Int(Double(remaining) / speed * 3600)
            return seconds > 0 ? "~\(seconds.durationText)" : nil
        }
    }
}

struct UnreadTriangle: View {
    var body: some View {
        Triangle()
            .fill(Color.accentColor)
            .frame(width: 22, height: 22)
            .accessibilityLabel("Sin leer")
    }
}

struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.closeSubpath()
        return path
    }
}
