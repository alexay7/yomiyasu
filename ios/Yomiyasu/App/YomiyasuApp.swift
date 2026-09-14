import SwiftUI

@main
struct YomiyasuApp: App {
    @State private var environment = AppEnvironment()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(environment)
                .task {
                    await environment.session.bootstrap()
                }
        }
    }
}
