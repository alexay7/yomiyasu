import Foundation

@MainActor
protocol AuthTokenProvider: AnyObject {
    var accessToken: String? { get }
    func refreshTokens() async throws
}

@MainActor
final class APIClient {
    /// Centinela mientras no hay servidor configurado. No se usa para red: las
    /// peticiones fallan con ``APIError/serverNotConfigured`` hasta que
    /// ``AppEnvironment/applyServer(_:)`` fija una URL real.
    nonisolated static let unconfiguredBaseURL = URL(string: "yomiyasu://unconfigured")!

    private(set) var baseURL: URL
    weak var authProvider: (any AuthTokenProvider)?

    private let session: URLSession
    private let decoder: JSONDecoder

    init(
        baseURL: URL = APIClient.unconfiguredBaseURL,
        session: URLSession = .shared
    ) {
        self.baseURL = baseURL
        self.session = session
        decoder = .yomiyasu()
    }

    func setBaseURL(_ url: URL) {
        baseURL = url
    }

    func send<T: Decodable>(
        _ endpoint: Endpoint,
        as type: T.Type = T.self,
        authorized: Bool = true,
        allowRefresh: Bool = true
    ) async throws -> T {
        let data = try await performRequest(
            endpoint,
            authorized: authorized,
            allowRefresh: allowRefresh
        )

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }

    func send(
        _ endpoint: Endpoint,
        authorized: Bool = true,
        allowRefresh: Bool = true
    ) async throws {
        _ = try await performRequest(
            endpoint,
            authorized: authorized,
            allowRefresh: allowRefresh
        )
    }

    func sendData(
        _ endpoint: Endpoint,
        authorized: Bool = true,
        allowRefresh: Bool = true
    ) async throws -> Data {
        try await performRequest(
            endpoint,
            authorized: authorized,
            allowRefresh: allowRefresh
        )
    }

    private func performRequest(
        _ endpoint: Endpoint,
        authorized: Bool,
        allowRefresh: Bool
    ) async throws -> Data {
        let request = try makeRequest(endpoint, authorized: authorized)

        let data: Data
        let response: URLResponse

        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.transport(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.unexpectedResponse
        }

        if (200..<300).contains(http.statusCode) {
            return data
        }

        let envelope = try? decoder.decode(ErrorEnvelope.self, from: data)

        if http.statusCode == 401, authorized, allowRefresh, let authProvider {
            try await authProvider.refreshTokens()
            return try await performRequest(endpoint, authorized: true, allowRefresh: false)
        }

        throw APIError.http(status: http.statusCode, envelope: envelope)
    }

    private func makeRequest(_ endpoint: Endpoint, authorized: Bool) throws -> URLRequest {
        guard baseURL != APIClient.unconfiguredBaseURL else {
            throw APIError.serverNotConfigured
        }

        guard var components = URLComponents(
            url: baseURL.appending(path: endpoint.path),
            resolvingAgainstBaseURL: false
        ) else {
            throw APIError.invalidURL
        }

        if !endpoint.queryItems.isEmpty {
            components.queryItems = endpoint.queryItems
        }

        guard let url = components.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.httpBody = endpoint.body
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        for (name, value) in endpoint.headers {
            request.setValue(value, forHTTPHeaderField: name)
        }

        if authorized, let accessToken = authProvider?.accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }

        return request
    }
}

extension JSONDecoder {
    nonisolated static func yomiyasu() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let string = try container.decode(String.self)

            if let date = ISO8601DateFormatter.fractional.date(from: string)
                ?? ISO8601DateFormatter.standard.date(from: string) {
                return date
            }

            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Fecha no válida: \(string)"
            )
        }
        return decoder
    }
}

extension ISO8601DateFormatter {
    nonisolated(unsafe) static let fractional: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    nonisolated(unsafe) static let standard: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()
}
