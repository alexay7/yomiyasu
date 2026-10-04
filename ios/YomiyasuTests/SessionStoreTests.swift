import XCTest

@testable import Yomiyasu

final class SessionStoreTests: XCTestCase {
    private let keychain = KeychainStore(service: "es.manabe.yomiyasu.session-tests")
    private let defaultsSuite = "es.manabe.yomiyasu.session-tests"
    private var defaults: UserDefaults!

    override func setUp() {
        super.setUp()
        URLProtocolStub.handler = nil
        clearKeychain()
        defaults = UserDefaults(suiteName: defaultsSuite)
        defaults.removePersistentDomain(forName: defaultsSuite)
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: defaultsSuite)
        defaults = nil
        clearKeychain()
        URLProtocolStub.handler = nil
        super.tearDown()
    }

    @MainActor
    func testLoginStoresTokensAndUpdatesState() async throws {
        URLProtocolStub.handler = { request in
            XCTAssertEqual(request.url?.path, "/api/auth/login")
            return URLProtocolStub.respond(
                to: request,
                status: 200,
                json: """
                {
                  "status": "ok",
                  "uuid": "device-uuid",
                  "user": {"_id": "u1", "username": "alex", "email": "a@b.c", "admin": false},
                  "accessToken": "access-1",
                  "refreshToken": "refresh-1"
                }
                """
            )
        }

        let session = makeSession()
        await session.bootstrap()
        XCTAssertEqual(session.state, .loggedOut)

        try await session.login(usernameOrEmail: "alex", password: "secret")

        guard case .loggedIn(let user) = session.state else {
            return XCTFail("Se esperaba sesión iniciada")
        }

        XCTAssertEqual(user.username, "alex")
        XCTAssertEqual(session.accessToken, "access-1")
        XCTAssertEqual(keychain.string(for: "refreshToken"), "refresh-1")
        XCTAssertNil(session.notice)
    }

    @MainActor
    func testBootstrapRestoresStoredSession() async throws {
        keychain.set("access-1", for: "accessToken")
        keychain.set("refresh-1", for: "refreshToken")
        keychain.set("device-uuid", for: "uuid")

        URLProtocolStub.handler = { request in
            XCTAssertEqual(request.url?.path, "/api/auth/me")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer access-1")
            return URLProtocolStub.respond(
                to: request,
                status: 200,
                json: #"{"_id":"u1","username":"alex","email":"a@b.c","admin":false}"#
            )
        }

        let session = makeSession()
        await session.bootstrap()

        guard case .loggedIn(let user) = session.state else {
            return XCTFail("Se esperaba sesión restaurada")
        }

        XCTAssertEqual(user.id, "u1")
        XCTAssertEqual(session.uuid, "device-uuid")
    }

    @MainActor
    func testExpiredRefreshClearsSessionAndSetsNotice() async throws {
        keychain.set("refresh-1", for: "refreshToken")
        keychain.set("device-uuid", for: "uuid")

        URLProtocolStub.handler = { request in
            if request.url?.path == "/api/auth/refresh" {
                return URLProtocolStub.respond(
                    to: request,
                    status: 403,
                    json: #"{"statusCode":403,"status":"NONE","message":"Forbidden"}"#
                )
            }

            return URLProtocolStub.respond(
                to: request,
                status: 401,
                json: #"{"statusCode":401,"status":"REFRESH","message":"Unauthorized"}"#
            )
        }

        let session = makeSession()
        await session.bootstrap()

        XCTAssertEqual(session.state, .loggedOut)
        XCTAssertEqual(session.notice, SessionStore.sessionExpiredMessage)
        XCTAssertNil(keychain.string(for: "refreshToken"))
    }

    @MainActor
    func testBootstrapKeepsSessionOnNetworkError() async throws {
        keychain.set("access-1", for: "accessToken")
        keychain.set("refresh-1", for: "refreshToken")
        keychain.set("device-uuid", for: "uuid")

        // Usuario cacheado de un login anterior
        let user = AuthUser(id: "u1", username: "alex", email: "a@b.c", admin: false)
        defaults.set(try JSONEncoder().encode(user), forKey: "session.cachedUser")

        URLProtocolStub.handler = { _ in
            throw URLError(.notConnectedToInternet)
        }

        let session = makeSession()
        await session.bootstrap()

        guard case .loggedIn(let restored) = session.state else {
            return XCTFail("Se esperaba mantener la sesión sin conexión")
        }

        XCTAssertEqual(restored, user)
        XCTAssertEqual(session.accessToken, "access-1")
        XCTAssertEqual(keychain.string(for: "refreshToken"), "refresh-1")
    }

    @MainActor
    func testBootstrapClearsSessionOnUnauthorized() async throws {
        keychain.set("access-1", for: "accessToken")
        keychain.set("refresh-1", for: "refreshToken")
        keychain.set("device-uuid", for: "uuid")

        URLProtocolStub.handler = { request in
            URLProtocolStub.respond(
                to: request,
                status: 401,
                json: #"{"statusCode":401,"status":"REFRESH","message":"Unauthorized"}"#
            )
        }

        let session = makeSession()
        await session.bootstrap()

        XCTAssertEqual(session.state, .loggedOut)
        XCTAssertEqual(session.notice, SessionStore.sessionExpiredMessage)
        XCTAssertNil(keychain.string(for: "refreshToken"))
    }

    @MainActor
    func testFreshAccessTokenRefreshesExpiredToken() async throws {
        keychain.set(makeJWT(expiringAt: Date().addingTimeInterval(-3600)), for: "accessToken")
        keychain.set("refresh-1", for: "refreshToken")
        keychain.set("device-uuid", for: "uuid")

        URLProtocolStub.handler = { request in
            if request.url?.path == "/api/auth/refresh" {
                return URLProtocolStub.respond(
                    to: request,
                    status: 200,
                    json: """
                    {
                      "status": "ok",
                      "uuid": "device-uuid",
                      "accessToken": "access-2",
                      "refreshToken": "refresh-2"
                    }
                    """
                )
            }

            return URLProtocolStub.respond(
                to: request,
                status: 200,
                json: #"{"_id":"u1","username":"alex","email":"a@b.c","admin":false}"#
            )
        }

        let session = makeSession()
        await session.bootstrap()
        let token = try await session.freshAccessToken()

        XCTAssertEqual(token, "access-2")
        XCTAssertEqual(keychain.string(for: "refreshToken"), "refresh-2")
    }

    @MainActor
    func testFreshAccessTokenKeepsValidToken() async throws {
        let valid = makeJWT(expiringAt: Date().addingTimeInterval(3600))
        keychain.set(valid, for: "accessToken")
        keychain.set("refresh-1", for: "refreshToken")

        URLProtocolStub.handler = { request in
            if request.url?.path == "/api/auth/me" {
                return URLProtocolStub.respond(
                    to: request,
                    status: 200,
                    json: #"{"_id":"u1","username":"alex","email":"a@b.c","admin":false}"#
                )
            }

            XCTFail("No debería renovarse el token: \(request.url?.path ?? "")")
            return URLProtocolStub.respond(to: request, status: 500, json: "{}")
        }

        let session = makeSession()
        await session.bootstrap()
        let token = try await session.freshAccessToken()

        XCTAssertEqual(token, valid)
    }

    @MainActor
    func testLogoutWithNoticeShowsMessage() async throws {
        keychain.set("access-1", for: "accessToken")
        keychain.set("refresh-1", for: "refreshToken")

        URLProtocolStub.handler = { request in
            URLProtocolStub.respond(to: request, status: 200, json: #"{"status":"ok","uuid":"u"}"#)
        }

        let session = makeSession()
        await session.logout(notice: "La contraseña ha cambiado.")

        XCTAssertEqual(session.state, .loggedOut)
        XCTAssertEqual(session.notice, "La contraseña ha cambiado.")
        XCTAssertNil(keychain.string(for: "accessToken"))
    }

    @MainActor
    private func makeSession() -> SessionStore {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [URLProtocolStub.self]

        let api = APIClient(
            baseURL: URL(string: "https://example.test")!,
            session: URLSession(configuration: configuration)
        )
        return SessionStore(api: api, keychain: keychain, defaults: defaults)
    }

    private func makeJWT(expiringAt date: Date) -> String {
        func encode(_ string: String) -> String {
            Data(string.utf8).base64EncodedString()
                .replacingOccurrences(of: "+", with: "-")
                .replacingOccurrences(of: "/", with: "_")
                .replacingOccurrences(of: "=", with: "")
        }

        let header = encode(#"{"alg":"HS256","typ":"JWT"}"#)
        let payload = encode("{\"exp\":\(Int(date.timeIntervalSince1970))}")

        return "\(header).\(payload).signature"
    }

    private func clearKeychain() {
        keychain.remove("accessToken")
        keychain.remove("refreshToken")
        keychain.remove("uuid")
    }
}
