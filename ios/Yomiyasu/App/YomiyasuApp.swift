import Nuke
import SwiftUI

@main
struct YomiyasuApp: App {
    @State private var environment = AppEnvironment()

    init() {
        // Caché de disco propia (2 GB) para páginas y portadas: la URLCache por
        // defecto (150 MB, HTTP) se queda corta al leer tomos largos y hacía
        // que las páginas ya vistas se volvieran a descargar entre sesiones
        ImagePipeline.shared = ImagePipeline(
            configuration: .withDataCache(
                name: "es.manabe.yomiyasu.images",
                sizeLimit: 2 * 1024 * 1024 * 1024
            )
        )
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(environment)
                .task {
                    await environment.bootstrap()
                }
        }
    }
}
