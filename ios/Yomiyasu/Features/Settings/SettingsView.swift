import SwiftUI

struct SettingsView: View {
    @Environment(AppEnvironment.self) private var environment

    @State private var showingLogout = false

    var body: some View {
        @Bindable var settings = environment.settings

        Form {
            Section {
                Picker("Apariencia", selection: $settings.appearance) {
                    ForEach(AppAppearance.allCases) { appearance in
                        Text(appearance.title).tag(appearance)
                    }
                }
                .pickerStyle(.segmented)
            }

            Section {
                Picker("Contenido", selection: $settings.mainView) {
                    ForEach(MainView.allCases) { view in
                        Text(view.title).tag(view)
                    }
                }
            } header: {
                Text("Vista principal")
            } footer: {
                Text("Filtra lo que aparece en Inicio y Lista de lectura.")
            }

            Section {
                Toggle("Ocultar spoilers de volúmenes no leídos", isOn: $settings.antispoilers)

                Picker("Info. de los libros", selection: $settings.bookView) {
                    ForEach(BookViewMode.allCases) { mode in
                        Text(mode.title).tag(mode)
                    }
                }
            } header: {
                Text("Biblioteca")
            }

            Section {
                Toggle("En progreso", isOn: $settings.boards.progress)
                Toggle("Tu tablero", isOn: $settings.boards.tablero)
                Toggle("Leer más tarde", isOn: $settings.boards.readLater)
                Toggle("Pausadas", isOn: $settings.boards.paused)
                Toggle("Libros nuevos", isOn: $settings.boards.newBooks)
                Toggle("Series nuevas", isOn: $settings.boards.newSeries)
                Toggle("Series con volúmenes nuevos", isOn: $settings.boards.recentSeries)
            } header: {
                Text("Tableros del inicio")
            } footer: {
                Text("Elige qué secciones quieres ver en el inicio.")
            }

            Section {
                Toggle("Mostrar cronómetro en el lector", isOn: $settings.showCrono)
                Toggle("Iniciar cronómetro al abrir un libro", isOn: $settings.autoCrono)

                Picker("Pausar cronómetro tras inactividad", selection: $settings.idleTimeout) {
                    Text("Nunca").tag(0)
                    Text("1 minuto").tag(1)
                    Text("3 minutos").tag(3)
                    Text("5 minutos").tag(5)
                    Text("10 minutos").tag(10)
                    Text("15 minutos").tag(15)
                }
            } header: {
                Text("Lectura")
            } footer: {
                Text("El cronómetro se reanuda al cambiar de página.")
            }

            Section {
                NavigationLink {
                    AccountSettingsView()
                } label: {
                    Label("Cuenta", systemImage: "person.crop.circle")
                }

                Button("Cerrar sesión", role: .destructive) {
                    showingLogout = true
                }
            }

            #if DEBUG
            Section("Diagnóstico") {
                LabeledContent("Servidor", value: environment.api.baseURL.absoluteString)
                LabeledContent(
                    "Websocket",
                    value: environment.socket.isConnected ? "Conectado" : "Desconectado"
                )
                if let updatedAt = environment.socket.libraryUpdatedAt {
                    LabeledContent(
                        "Última actualización",
                        value: updatedAt.formatted(date: .omitted, time: .standard)
                    )
                }
            }
            #endif
        }
        .navigationTitle("Ajustes")
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
