import XCTest

@testable import Yomiyasu

final class APIClientTests: XCTestCase {
    override func setUp() {
        super.setUp()
        URLProtocolStub.handler = nil
    }

    override func tearDown() {
        URLProtocolStub.handler = nil
        super.tearDown()
    }

    @MainActor
    func testLoginSendsTransportHeaderAndDecodesResponse() async throws {
        let (client, _) = makeClient()

        URLProtocolStub.handler = { request in
            XCTAssertEqual(request.url?.path, "/api/auth/login")
            XCTAssertEqual(request.httpMethod, "POST")
            XCTAssertEqual(request.value(forHTTPHeaderField: "X-Token-Transport"), "body")

            let body = try XCTUnwrap(request.bodyData)
            let json = try XCTUnwrap(
                JSONSerialization.jsonObject(with: body) as? [String: String]
            )
            XCTAssertEqual(json["usernameOrEmail"], "alex")
            XCTAssertEqual(json["password"], "secret")
            XCTAssertEqual(json["uuid"], "device-uuid")

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

        let endpoint = try Endpoint.post(
            "api/auth/login",
            json: LoginRequest(
                usernameOrEmail: "alex",
                password: "secret",
                uuid: "device-uuid"
            ),
            headers: ["X-Token-Transport": "body"]
        )

        let response: LoginResponse = try await client.send(endpoint, authorized: false)

        XCTAssertEqual(response.accessToken, "access-1")
        XCTAssertEqual(response.refreshToken, "refresh-1")
        XCTAssertEqual(response.user.username, "alex")
        XCTAssertEqual(response.user.id, "u1")
    }

    @MainActor
    func testAuthorizedRequestSendsBearerToken() async throws {
        let (client, authProvider) = makeClient()

        URLProtocolStub.handler = { request in
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer old-access")
            return URLProtocolStub.respond(to: request, status: 200, json: #"{"status":"ok"}"#)
        }

        let response: StatusResponse = try await client.send(.get("api/auth/me"))

        XCTAssertEqual(response.status, "ok")
        XCTAssertEqual(authProvider.accessToken, "old-access")
    }

    @MainActor
    func testUnauthorizedTriggersRefreshAndRetriesOnce() async throws {
        let (client, authProvider) = makeClient()
        var callCount = 0

        URLProtocolStub.handler = { request in
            callCount += 1

            if callCount == 1 {
                return URLProtocolStub.respond(
                    to: request,
                    status: 401,
                    json: #"{"statusCode":401,"status":"REFRESH","message":"Unauthorized"}"#
                )
            }

            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer new-access")
            return URLProtocolStub.respond(to: request, status: 200, json: #"{"status":"ok"}"#)
        }

        let response: StatusResponse = try await client.send(.get("api/books/manga"))

        XCTAssertEqual(response.status, "ok")
        XCTAssertEqual(authProvider.refreshCount, 1)
        XCTAssertEqual(callCount, 2)
    }

    @MainActor
    func testRefreshFailurePropagatesSessionExpired() async throws {
        let (client, authProvider) = makeClient()
        authProvider.refreshError = .sessionExpired

        URLProtocolStub.handler = { request in
            URLProtocolStub.respond(
                to: request,
                status: 401,
                json: #"{"statusCode":401,"status":"REFRESH","message":"Unauthorized"}"#
            )
        }

        do {
            let _: StatusResponse = try await client.send(.get("api/books/manga"))
            XCTFail("Se esperaba sessionExpired")
        } catch let error as APIError {
            guard case .sessionExpired = error else {
                return XCTFail("Se esperaba sessionExpired, llegó \(error)")
            }
        }
    }

    func testUpdateUserRequestOmitsNilFields() throws {
        let endpoint = try Endpoint.patch(
            "api/users/update",
            json: UpdateUserRequest(newUsername: "nuevo")
        )

        XCTAssertEqual(endpoint.method, .patch)

        let body = try XCTUnwrap(endpoint.body)
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: body) as? [String: Any])

        XCTAssertEqual(json["newUsername"] as? String, "nuevo")
        XCTAssertEqual(json.count, 1)
    }

    @MainActor
    private func makeClient() -> (APIClient, TestAuthProvider) {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [URLProtocolStub.self]

        let client = APIClient(
            baseURL: URL(string: "https://example.test")!,
            session: URLSession(configuration: configuration)
        )
        let authProvider = TestAuthProvider()
        client.authProvider = authProvider
        return (client, authProvider)
    }
}

@MainActor
private final class TestAuthProvider: AuthTokenProvider {
    var accessToken: String? = "old-access"
    var refreshCount = 0
    var refreshError: APIError?

    func refreshTokens() async throws {
        refreshCount += 1

        if let refreshError {
            throw refreshError
        }

        accessToken = "new-access"
    }
}
