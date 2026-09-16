import SwiftUI

struct LoginView: View {
    @Environment(AppEnvironment.self) private var environment

    @State private var serverURL = ""
    @State private var usernameOrEmail = ""
    @State private var password = ""
    @State private var isLoggingIn = false
    @State private var errorMessage: String?
    @State private var showingRedeem = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                VStack(spacing: 8) {
                    Text("Yomiyasu")
                        .font(.largeTitle.bold())
                    Text("Inicia sesión para continuar")
                        .foregroundStyle(.secondary)

                    if let notice = environment.session.notice {
                        Text(notice)
                            .foregroundStyle(.orange)
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: 400)
                            .padding(.top, 4)
                    }
                }

                VStack(spacing: 16) {
                    TextField("Servidor (https://…)", text: $serverURL)
                        .textContentType(.URL)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    TextField("Usuario o correo", text: $usernameOrEmail)
                        .textContentType(.username)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    SecureField("Contraseña", text: $password)
                        .textContentType(.password)
                }
                .textFieldStyle(.roundedBorder)
                .frame(maxWidth: 400)

                if let errorMessage {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 400)
                }

                Button {
                    Task { await login() }
                } label: {
                    Group {
                        if isLoggingIn {
                            ProgressView()
                        } else {
                            Text("Entrar")
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .frame(maxWidth: 400)
                .disabled(isLoggingIn || serverURL.isEmpty || usernameOrEmail.isEmpty || password.isEmpty)

                Button("¿Tienes un código de invitación?") {
                    guard applyServerIfNeeded() else { return }
                    showingRedeem = true
                }
                .font(.footnote)
            }
            .padding()
            .onSubmit {
                Task { await login() }
            }
            .navigationDestination(isPresented: $showingRedeem) {
                RedeemView()
            }
            .task {
                if serverURL.isEmpty {
                    serverURL = environment.server.baseURL?.absoluteString ?? ""
                }
                await autoLoginIfRequested()
            }
        }
    }

    private func login() async {
        guard !isLoggingIn else { return }

        isLoggingIn = true
        errorMessage = nil
        defer { isLoggingIn = false }

        guard applyServerIfNeeded() else { return }

        do {
            try await environment.session.login(
                usernameOrEmail: usernameOrEmail,
                password: password
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Valida y persiste el servidor escrito, si ha cambiado. Devuelve `false`
    /// y muestra el error cuando la URL no es válida.
    private func applyServerIfNeeded() -> Bool {
        let trimmed = serverURL.trimmingCharacters(in: .whitespacesAndNewlines)

        if let current = environment.server.baseURL,
           current.absoluteString == ServerConfig.parse(trimmed)?.absoluteString {
            return true
        }

        guard environment.applyServer(trimmed) != nil else {
            errorMessage = trimmed.isEmpty
                ? "Introduce la URL del servidor."
                : "La dirección del servidor no es válida."
            return false
        }

        serverURL = environment.server.baseURL?.absoluteString ?? trimmed
        return true
    }

    private func autoLoginIfRequested() async {
        #if DEBUG
        let processEnvironment = ProcessInfo.processInfo.environment

        guard usernameOrEmail.isEmpty,
              password.isEmpty,
              let user = processEnvironment["YOMIYASU_E2E_USER"],
              let pass = processEnvironment["YOMIYASU_E2E_PASSWORD"] else {
            return
        }

        usernameOrEmail = user
        password = pass
        await login()
        #endif
    }
}
