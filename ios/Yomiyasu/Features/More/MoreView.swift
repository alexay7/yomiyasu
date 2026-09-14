import SwiftUI

struct MoreView: View {
    @Environment(AppEnvironment.self) private var environment

    @State private var showingLogout = false

    var body: some View {
        List {
            Section("Contenido") {
                NavigationLink(value: MoreRoute.history) { Label("Historial", systemImage: "clock") }
                NavigationLink(value: MoreRoute.calendar) { Label("Calendario", systemImage: "calendar") }
                NavigationLink(value: MoreRoute.stats) { Label("Estadísticas", systemImage: "chart.bar") }
                NavigationLink(value: MoreRoute.downloads) { Label("Descargas", systemImage: "arrow.down.circle") }
            }

            Section("Cuenta") {
                NavigationLink(value: MoreRoute.settings) {
                    Label("Ajustes", systemImage: "gearshape")
                }
                NavigationLink(value: MoreRoute.account) {
                    Label("Cuenta", systemImage: "person.crop.circle")
                }
                Button("Cerrar sesión", systemImage: "rectangle.portrait.and.arrow.right", role: .destructive) {
                    showingLogout = true
                }
            }
        }
        .navigationTitle("Más")
        .navigationDestination(for: MoreRoute.self) { route in
            switch route {
            case .history:
                HistoryView()
            case .calendar:
                CalendarView()
            case .stats:
                StatsView()
            case .downloads:
                DownloadsView()
            case .settings:
                SettingsView()
            case .account:
                AccountSettingsView()
            }
        }
        .confirmationDialog(
            "¿Cerrar sesión?",
            isPresented: $showingLogout,
            titleVisibility: .visible
        ) {
            Button("Cerrar sesión", role: .destructive) {
                Task { await environment.session.logout() }
            }
        }
    }
}

private enum MoreRoute: Hashable {
    case history
    case calendar
    case stats
    case downloads
    case settings
    case account
}
