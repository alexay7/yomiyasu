import XCTest

@testable import Yomiyasu

final class SessionStoreTests: XCTestCase {
    private let keychain = KeychainStore(service: "es.manabe.yomiyasu.session-tests")

    override func setUp() {
        super.setUp()
        URLProtocolStub.handler = nil
        clearKeychain()
    }

    override func tearDown() {
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
        return SessionStore(api: api, keychain: keychain)
    }

    private func clearKeychain() {
        keychain.remove("accessToken")
        keychain.remove("refreshToken")
        keychain.remove("uuid")
    }
}
