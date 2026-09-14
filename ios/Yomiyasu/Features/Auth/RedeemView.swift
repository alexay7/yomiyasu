import SwiftUI

struct RedeemView: View {
    @Environment(AppEnvironment.self) private var environment

    @State private var code = ""
    @State private var username = ""
    @State private var email = ""
    @State private var password = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    var body: some View {
        Form {
            Section {
                TextField("Código de invitación", text: $code)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                TextField("Usuario", text: $username)
                    .textContentType(.username)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                TextField("Correo", text: $email)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                SecureField("Contraseña", text: $password)
                    .textContentType(.newPassword)
            } footer: {
                Text("Necesitas un código de invitación para crear una cuenta.")
            }

            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                }
            }

            Section {
                Button {
                    Task { await redeem() }
                } label: {
                    if isSubmitting {
                        ProgressView()
                    } else {
                        Text("Crear cuenta")
                    }
                }
                .disabled(isSubmitting || !isValid)
            }
        }
        .navigationTitle("Canjear código")
    }

    private var isValid: Bool {
        !code.trimmingCharacters(in: .whitespaces).isEmpty &&
        !username.trimmingCharacters(in: .whitespaces).isEmpty &&
        email.contains("@") &&
        password.count >= 6
    }

    private func redeem() async {
        guard !isSubmitting else { return }

        isSubmitting = true
        errorMessage = nil
        defer { isSubmitting = false }

        do {
            let endpoint = try Endpoint.post(
                "api/invis/redeem",
                json: RedeemRequest(
                    code: code.trimmingCharacters(in: .whitespaces),
                    username: username.trimmingCharacters(in: .whitespaces),
                    email: email.trimmingCharacters(in: .whitespaces),
                    password: password
                )
            )

            let _: RedeemResponse = try await environment.api.send(endpoint, authorized: false)

            try await environment.session.login(
                usernameOrEmail: username.trimmingCharacters(in: .whitespaces),
                password: password
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
