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

    private enum Key {
        static let accessToken = "accessToken"
        static let refreshToken = "refreshToken"
        static let uuid = "uuid"
    }

    init(api: APIClient, keychain: KeychainStore = KeychainStore()) {
        self.api = api
        self.keychain = keychain
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
            updateState(.loggedIn(user))
        } catch {
            clearSession(notice: Self.sessionExpiredMessage)
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
        updateState(.loggedIn(response.user))
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

    func updateUsername(_ username: String) {
        guard case .loggedIn(let user) = state else { return }

        let updated = AuthUser(
            id: user.id,
            username: username,
            email: user.email,
            admin: user.admin
        )
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
        self.notice = notice
        updateState(.loggedOut)
    }
}
