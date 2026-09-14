import SwiftUI

struct AccountSettingsView: View {
    @Environment(AppEnvironment.self) private var environment

    @State private var newUsername = ""
    @State private var oldPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var isSavingUsername = false
    @State private var isSavingPassword = false
    @State private var message: String?
    @State private var errorMessage: String?

    var body: some View {
        Form {
            Section("Usuario") {
                LabeledContent("Usuario actual", value: currentUsername)

                TextField("Nuevo nombre de usuario", text: $newUsername)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()

                Button {
                    Task { await updateUsername() }
                } label: {
                    if isSavingUsername {
                        ProgressView()
                    } else {
                        Text("Cambiar usuario")
                    }
                }
                .disabled(isSavingUsername || newUsername.trimmingCharacters(in: .whitespaces).isEmpty)
            }

            Section {
                SecureField("Contraseña actual", text: $oldPassword)
                    .textContentType(.password)
                SecureField("Nueva contraseña", text: $newPassword)
                    .textContentType(.newPassword)
                SecureField("Repetir nueva contraseña", text: $confirmPassword)
                    .textContentType(.newPassword)

                Button {
                    Task { await updatePassword() }
                } label: {
                    if isSavingPassword {
                        ProgressView()
                    } else {
                        Text("Cambiar contraseña")
                    }
                }
                .disabled(isSavingPassword || oldPassword.isEmpty || newPassword.count < 6)
            } header: {
                Text("Contraseña")
            } footer: {
                Text("Al cambiar la contraseña se cerrará la sesión en todos los dispositivos.")
            }

            if let message {
                Section {
                    Text(message)
                        .foregroundStyle(.green)
                }
            }

            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                }
            }
        }
        .navigationTitle("Cuenta")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var currentUsername: String {
        if case .loggedIn(let user) = environment.session.state {
            return user.username
        }
        return "—"
    }

    private func updateUsername() async {
        guard !isSavingUsername else { return }

        isSavingUsername = true
        message = nil
        errorMessage = nil
        defer { isSavingUsername = false }

        let username = newUsername.trimmingCharacters(in: .whitespaces)

        do {
            let endpoint = try Endpoint.patch(
                "api/users/update",
                json: UpdateUserRequest(newUsername: username)
            )
            let _: StatusResponse = try await environment.api.send(endpoint)

            environment.session.updateUsername(username)
            newUsername = ""
            message = "Usuario actualizado."
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func updatePassword() async {
        guard !isSavingPassword else { return }

        guard newPassword == confirmPassword else {
            errorMessage = "Las contraseñas no coinciden."
            return
        }

        isSavingPassword = true
        message = nil
        errorMessage = nil
        defer { isSavingPassword = false }

        do {
            let endpoint = try Endpoint.patch(
                "api/users/update",
                json: UpdateUserRequest(oldPassword: oldPassword, newPassword: newPassword)
            )
            let _: StatusResponse = try await environment.api.send(endpoint)

            await environment.session.logout(
                notice: "La contraseña ha cambiado. Vuelve a iniciar sesión."
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
