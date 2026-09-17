import SwiftUI

struct SerieCard: View {
    @Environment(AppEnvironment.self) private var environment

    let serie: Serie
    /// Ancho fijo de la tarjeta. En las cuadrículas se pasa `nil` para que
    /// ocupe la celda entera (con un ancho fijo la portada desbordaba su
    /// columna y se pegaba a las vecinas). Los carruseles usan ancho fijo.
    var width: CGFloat? = 120

    @State private var actionError: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ZStack(alignment: .topTrailing) {
                cover

                if serie.unreadCount > 0 {
                    Text("\(serie.unreadCount)")
                        .font(.caption2.bold())
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(
                            Capsule().fill(serie.isInReadlist ? Color.teal : Color.accentColor)
                        )
                        .padding(5)
                }
            }

            sized(
                Text(serie.visibleName)
                    .font(.caption)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
            )

            HStack(spacing: 6) {
                DifficultyFlame(difficulty: serie.difficulty ?? 0)
                    .font(.caption2)

                if let valoration = serie.valoration, valoration > 0 {
                    StarRating(valoration: valoration)
                }

                if serie.isPaused {
                    Image(systemName: "pause.circle.fill")
                        .font(.caption2)
                        .foregroundStyle(.orange)
                }
            }
        }
        .padding(.vertical, 2)
        .opacity(serie.missing == true ? 0.5 : 1)
        .contextMenu {
            menuItems
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
        .accessibilityIdentifier("serieCard-\(serie.id)")
    }

    // MARK: - Portada

    @ViewBuilder
    private var cover: some View {
        if let width {
            RemoteImage(url: StaticURLs.serieCover(serie, baseURL: environment.api.baseURL))
                .frame(width: width, height: width * 1.45)
                .clipShape(RoundedRectangle(cornerRadius: 10))
        } else {
            RemoteImage(url: StaticURLs.serieCover(serie, baseURL: environment.api.baseURL))
                .aspectRatio(1 / 1.45, contentMode: .fit)
                .frame(maxWidth: .infinity)
                .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    /// Aplica el ancho de la tarjeta al contenido: fijo si se indicó uno,
    /// o el ancho completo de la celda en las cuadrículas.
    @ViewBuilder
    private func sized<V: View>(_ view: V) -> some View {
        if let width {
            view.frame(width: width, alignment: .leading)
        } else {
            view.frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Menú contextual

    @ViewBuilder
    private var menuItems: some View {
        if let currentBookId = serie.currentBook?.id {
            NavigationLink(value: BookRoute(id: currentBookId)) {
                Label(
                    serie.unreadCount == 0 ? "Leer de nuevo" : "Leer siguiente volumen",
                    systemImage: "play.circle"
                )
            }
        }

        if serie.unreadCount > 0 {
            Button {
                markRead()
            } label: {
                Label("Marcar serie como leída", systemImage: "checkmark.circle")
            }
        }

        Button {
            setPaused(!serie.isPaused)
        } label: {
            Label(
                serie.isPaused ? "Reanudar serie" : "Pausar serie",
                systemImage: serie.isPaused ? "play.circle" : "pause.circle"
            )
        }

        Button {
            toggleReadlist()
        } label: {
            Label(
                serie.isInReadlist ? "Quitar de Leer más tarde" : "Añadir a Leer más tarde",
                systemImage: serie.isInReadlist ? "bookmark.slash" : "bookmark"
            )
        }
    }

    // MARK: - Acciones

    private func markRead() {
        Task {
            do {
                try await environment.library.markSerieRead(serieId: serie.id)
                environment.socket.markLibraryUpdated()
            } catch {
                actionError = error.localizedDescription
            }
        }
    }

    private func setPaused(_ paused: Bool) {
        Task {
            do {
                try await environment.library.setSeriePaused(paused, serieId: serie.id)
                environment.socket.markLibraryUpdated()
            } catch {
                actionError = error.localizedDescription
            }
        }
    }

    private func toggleReadlist() {
        Task {
            do {
                if serie.isInReadlist {
                    try await environment.library.removeFromReadlist(serieId: serie.id)
                } else {
                    try await environment.library.addToReadlist(serieId: serie.id)
                }
                environment.socket.markLibraryUpdated()
            } catch {
                actionError = error.localizedDescription
            }
        }
    }
}
