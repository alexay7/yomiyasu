import Nuke
import NukeUI
import SwiftUI

struct CoverPlaceholder: View {
    var systemImage = "book.closed"

    var body: some View {
        ZStack {
            Rectangle()
                .fill(.quaternary)
            Image(systemName: systemImage)
                .font(.title3)
                .foregroundStyle(.secondary)
        }
    }
}

struct RemoteImage: View {
    @Environment(AppEnvironment.self) private var environment
    @State private var token: String?

    let url: URL?

    var body: some View {
        LazyImage(request: request) { state in
            if let image = state.image {
                image
                    .resizable()
                    .scaledToFill()
            } else {
                CoverPlaceholder()
            }
        }
        .task(id: url) {
            // Las portadas tampoco pasan por APIClient: renovar el token aquí
            // evita que queden rotas cuando caduca el access token
            token = try? await environment.session.freshAccessToken()
        }
    }

    private var request: ImageRequest? {
        guard let url else { return nil }
        return ImageRequestFactory.make(url: url, token: token ?? environment.session.accessToken)
    }
}
