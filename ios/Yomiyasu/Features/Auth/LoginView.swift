import SwiftUI

struct LoginView: View {
    @Environment(AppEnvironment.self) private var environment

    @State private var usernameOrEmail = ""
    @State private var password = ""
    @State private var isLoggingIn = false
    @State private var errorMessage: String?

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
                .disabled(isLoggingIn || usernameOrEmail.isEmpty || password.isEmpty)

                NavigationLink("¿Tienes un código de invitación?") {
                    RedeemView()
                }
                .font(.footnote)
            }
            .padding()
            .onSubmit {
                Task { await login() }
            }
            .task {
                await autoLoginIfRequested()
            }
        }
    }

    private func login() async {
        guard !isLoggingIn else { return }

        isLoggingIn = true
        errorMessage = nil
        defer { isLoggingIn = false }

        do {
            try await environment.session.login(
                usernameOrEmail: usernameOrEmail,
                password: password
            )
        } catch {
            errorMessage = error.localizedDescription
        }
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
