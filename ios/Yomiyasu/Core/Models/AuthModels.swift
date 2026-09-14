import Foundation

struct AuthUser: Codable, Sendable, Equatable {
    let id: String
    let username: String
    let email: String
    let admin: Bool

    private enum CodingKeys: String, CodingKey {
        case id = "_id"
        case username
        case email
        case admin
    }
}

struct LoginRequest: Encodable, Sendable {
    let usernameOrEmail: String
    let password: String
    let uuid: String
}

struct LoginResponse: Decodable, Sendable {
    let status: String
    let uuid: String
    let user: AuthUser
    let accessToken: String?
    let refreshToken: String?
}

struct RefreshRequest: Encodable, Sendable {
    let uuid: String
}

struct RefreshResponse: Decodable, Sendable {
    let status: String
    let uuid: String
    let accessToken: String?
    let refreshToken: String?
}

struct LogoutRequest: Encodable, Sendable {
    let uuid: String
}

struct StatusResponse: Decodable, Sendable {
    let status: String
}
