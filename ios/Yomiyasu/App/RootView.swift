import SwiftUI

struct RootView: View {
    @Environment(AppEnvironment.self) private var environment

    var body: some View {
        Group {
            switch environment.session.state {
            case .loading:
                ProgressView("Cargando…")
            case .loggedOut:
                LoginView()
            case .loggedIn:
                MainShellView()
            }
        }
        .preferredColorScheme(environment.settings.appearance.colorScheme)
    }
}
