import XCTest

@testable import Yomiyasu

final class ProgressAPITests: XCTestCase {
    override func setUp() {
        super.setUp()
        URLProtocolStub.handler = nil
    }

    override func tearDown() {
        URLProtocolStub.handler = nil
        super.tearDown()
    }

    @MainActor
    func testStreakSendsZeroBasedMonth() async throws {
        let client = makeClient()

        URLProtocolStub.handler = { request in
            XCTAssertEqual(request.url?.path, "/api/readprogress/streak/2026/8")
            return URLProtocolStub.respond(
                to: request,
                status: 200,
                json: #"[{"dayOfMonth":14,"count":3}]"#
            )
        }

        let days = try await ProgressAPI(client: client).streak(year: 2026, month: 9)

        XCTAssertEqual(days.count, 1)
        XCTAssertEqual(days.first?.dayOfMonth, 14)
        XCTAssertEqual(days.first?.count, 3)
    }

    @MainActor
    func testStreakJanuaryIsSentAsZero() async throws {
        let client = makeClient()

        URLProtocolStub.handler = { request in
            XCTAssertEqual(request.url?.path, "/api/readprogress/streak/2026/0")
            return URLProtocolStub.respond(to: request, status: 200, json: "[]")
        }

        _ = try await ProgressAPI(client: client).streak(year: 2026, month: 1)
    }

    @MainActor
    func testLogsKeepOneBasedMonthAndDay() async throws {
        let client = makeClient()

        URLProtocolStub.handler = { request in
            XCTAssertEqual(request.url?.path, "/api/readprogress/logs/2026/9/14")
            return URLProtocolStub.respond(to: request, status: 200, json: "[]")
        }

        _ = try await ProgressAPI(client: client).logs(year: 2026, month: 9, day: 14)
    }

    @MainActor
    private func makeClient() -> APIClient {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [URLProtocolStub.self]

        let client = APIClient(
            baseURL: URL(string: "https://example.test")!,
            session: URLSession(configuration: configuration)
        )
        client.authProvider = StubAuthProvider()
        return client
    }
}

@MainActor
private final class StubAuthProvider: AuthTokenProvider {
    var accessToken: String? = "stub-token"

    func refreshTokens() async throws {}
}
