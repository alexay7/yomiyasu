import Foundation
import Observation

@MainActor
@Observable
final class SessionStore: AuthTokenProvider {
    enum State: Equatable {
        case loading
        case loggedOut
        case loggedIn(AuthUser)
    }

    static let sessionExpiredMessage = "La sesión ha caducado. Vuelve a iniciar sesión."

    private(set) var state: State = .loading
    private(set) var uuid: String = ""
    private(set) var notice: String?

    var onSessionChange: ((Bool) -> Void)?

    var accessToken: String? { accessTokenValue }

    private var accessTokenValue: String?
    private var refreshTokenValue: String?

    private let keychain: KeychainStore
    private let api: APIClient
    private let defaults: UserDefaults
    private var refreshTask: Task<String, Error>?

    private enum Key {
        static let accessToken = "accessToken"
        static let refreshToken = "refreshToken"
        static let uuid = "uuid"
    }

    private enum DefaultsKey {
        static let cachedUser = "session.cachedUser"
    }

    init(
        api: APIClient,
        keychain: KeychainStore = KeychainStore(),
        defaults: UserDefaults = .standard
    ) {
        self.api = api
        self.keychain = keychain
        self.defaults = defaults
        api.authProvider = self
    }

    func bootstrap() async {
        if let storedUuid = keychain.string(for: Key.uuid) {
            uuid = storedUuid
        } else {
            uuid = UUID().uuidString.lowercased()
            keychain.set(uuid, for: Key.uuid)
        }

        accessTokenValue = keychain.string(for: Key.accessToken)
        refreshTokenValue = keychain.string(for: Key.refreshToken)

        guard refreshTokenValue != nil else {
            updateState(.loggedOut)
            return
        }

        do {
            let user: AuthUser = try await api.send(.get("api/auth/me"))
            cacheUser(user)
            updateState(.loggedIn(user))
        } catch let error as APIError {
            switch error {
            case .http(let status, _) where status == 401 || status == 403:
                // El servidor ha rechazado los tokens: sesión caducada
                clearSession(notice: Self.sessionExpiredMessage)
            default:
                // Sin conexión (o error temporal): conservar los tokens y
                // restaurar el último usuario conocido en lugar de cerrar sesión
                restoreCachedUserOrLoggedOut()
            }
        } catch {
            restoreCachedUserOrLoggedOut()
        }
    }

    func login(usernameOrEmail: String, password: String) async throws {
        notice = nil

        let endpoint = try Endpoint.post(
            "api/auth/login",
            json: LoginRequest(
                usernameOrEmail: usernameOrEmail,
                password: password,
                uuid: uuid
            ),
            headers: ["X-Token-Transport": "body"]
        )

        let response: LoginResponse = try await api.send(endpoint, authorized: false)

        guard let accessToken = response.accessToken,
              let refreshToken = response.refreshToken else {
            throw APIError.unexpectedResponse
        }

        persist(accessToken: accessToken, refreshToken: refreshToken)
        cacheUser(response.user)
        updateState(.loggedIn(response.user))
    }

    /// Devuelve un access token utilizable para peticiones que no pasan por
    /// APIClient (imágenes): si el actual está a punto de caducar lo renueva,
    /// compartiendo una única renovación entre llamadas concurrentes.
    func freshAccessToken() async throws -> String? {
        guard let token = accessTokenValue else { return nil }

        if !Self.isExpiringSoon(token) {
            return token
        }

        guard refreshTokenValue != nil else { return token }

        if let refreshTask {
            return try await refreshTask.value
        }

        let task = Task { () -> String in
            try await self.refreshTokens()

            guard let refreshed = self.accessTokenValue else {
                throw APIError.sessionExpired
            }

            return refreshed
        }

        refreshTask = task
        defer { refreshTask = nil }

        return try await task.value
    }

    func refreshTokens() async throws {
        guard let refreshTokenValue else {
            clearSession(notice: Self.sessionExpiredMessage)
            throw APIError.sessionExpired
        }

        do {
            let endpoint = try Endpoint.post(
                "api/auth/refresh",
                json: RefreshRequest(uuid: uuid),
                headers: [
                    "X-Token-Transport": "body",
                    "Authorization": "Bearer \(refreshTokenValue)",
                ]
            )

            let response: RefreshResponse = try await api.send(endpoint, authorized: false)

            guard let accessToken = response.accessToken,
                  let refreshToken = response.refreshToken else {
                clearSession(notice: Self.sessionExpiredMessage)
                throw APIError.sessionExpired
            }

            persist(accessToken: accessToken, refreshToken: refreshToken)
        } catch let error as APIError {
            if case .http(let status, _) = error, status == 401 || status == 403 {
                clearSession(notice: Self.sessionExpiredMessage)
                throw APIError.sessionExpired
            }
            throw error
        }
    }

    func logout(notice: String? = nil) async {
        if let endpoint = try? Endpoint.post("api/auth/logout", json: LogoutRequest(uuid: uuid)) {
            _ = try? await api.send(endpoint, as: StatusResponse.self)
        }
        clearSession(notice: notice)
    }

    /// Cierra la sesión solo en el dispositivo, sin llamar al servidor. Se usa
    /// al cambiar de servidor, cuando los tokens pertenecen al anterior.
    func clearLocalSession(notice: String? = nil) {
        clearSession(notice: notice)
    }

    func updateUsername(_ username: String) {
        guard case .loggedIn(let user) = state else { return }

        let updated = AuthUser(
            id: user.id,
            username: username,
            email: user.email,
            admin: user.admin
        )
        cacheUser(updated)
        updateState(.loggedIn(updated))
    }

    private func updateState(_ newState: State) {
        state = newState

        switch newState {
        case .loggedIn:
            onSessionChange?(true)
        case .loggedOut:
            onSessionChange?(false)
        case .loading:
            break
        }
    }

    private func persist(accessToken: String, refreshToken: String) {
        accessTokenValue = accessToken
        refreshTokenValue = refreshToken
        keychain.set(accessToken, for: Key.accessToken)
        keychain.set(refreshToken, for: Key.refreshToken)
    }

    private func clearSession(notice: String? = nil) {
        accessTokenValue = nil
        refreshTokenValue = nil
        keychain.remove(Key.accessToken)
        keychain.remove(Key.refreshToken)
        defaults.removeObject(forKey: DefaultsKey.cachedUser)
        self.notice = notice
        updateState(.loggedOut)
    }

    /// Ante un fallo de red en bootstrap: seguir logueado con el último usuario
    /// cacheado. Si no hay ninguno, mostrar el login sin borrar los tokens.
    private func restoreCachedUserOrLoggedOut() {
        if let cachedUser {
            updateState(.loggedIn(cachedUser))
        } else {
            updateState(.loggedOut)
        }
    }

    private func cacheUser(_ user: AuthUser) {
        guard let data = try? JSONEncoder().encode(user) else { return }
        defaults.set(data, forKey: DefaultsKey.cachedUser)
    }

    private var cachedUser: AuthUser? {
        guard let data = defaults.data(forKey: DefaultsKey.cachedUser) else { return nil }
        return try? JSONDecoder().decode(AuthUser.self, from: data)
    }

    private static func isExpiringSoon(_ token: String, margin: TimeInterval = 300) -> Bool {
        guard let expiration = jwtExpiration(token) else { return false }

        return Date(timeIntervalSince1970: expiration).timeIntervalSinceNow < margin
    }

    /// Lee `exp` del payload del JWT sin verificar la firma: solo sirve para
    /// decidir si conviene renovarlo antes de una petición.
    private static func jwtExpiration(_ token: String) -> TimeInterval? {
        let parts = token.split(separator: ".")

        guard parts.count >= 2 else { return nil }

        var base64 = String(parts[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        while base64.count % 4 != 0 {
            base64.append("=")
        }

        guard let data = Data(base64Encoded: base64),
              let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let expiration = payload["exp"] as? TimeInterval else {
            return nil
        }

        return expiration
    }
}
