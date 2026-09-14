import Foundation

struct Endpoint: Sendable {
    enum Method: String, Sendable {
        case get = "GET"
        case post = "POST"
        case put = "PUT"
        case patch = "PATCH"
        case delete = "DELETE"
    }

    var method: Method
    var path: String
    var queryItems: [URLQueryItem] = []
    var body: Data?
    var headers: [String: String] = [:]

    static func get(
        _ path: String,
        queryItems: [URLQueryItem] = [],
        headers: [String: String] = [:]
    ) -> Endpoint {
        Endpoint(method: .get, path: path, queryItems: queryItems, headers: headers)
    }

    static func post(_ path: String, headers: [String: String] = [:]) -> Endpoint {
        Endpoint(method: .post, path: path, headers: headers)
    }

    static func post(
        _ path: String,
        json: some Encodable,
        headers: [String: String] = [:]
    ) throws -> Endpoint {
        var endpoint = Endpoint(method: .post, path: path, headers: headers)
        endpoint.body = try JSONEncoder().encode(json)
        endpoint.headers["Content-Type"] = "application/json"
        return endpoint
    }

    static func patch(
        _ path: String,
        json: some Encodable,
        headers: [String: String] = [:]
    ) throws -> Endpoint {
        var endpoint = Endpoint(method: .patch, path: path, headers: headers)
        endpoint.body = try JSONEncoder().encode(json)
        endpoint.headers["Content-Type"] = "application/json"
        return endpoint
    }
}
