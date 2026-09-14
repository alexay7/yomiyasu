import Foundation

struct RedeemRequest: Encodable, Sendable {
    let code: String
    let username: String
    let email: String
    let password: String
}

struct RedeemResponse: Decodable, Sendable {
    let id: String
    let username: String
    let email: String
    let admin: Bool?

    private enum CodingKeys: String, CodingKey {
        case id = "_id"
        case username
        case email
        case admin
    }
}

struct UpdateUserRequest: Encodable, Sendable {
    var newUsername: String?
    var oldPassword: String?
    var newPassword: String?
}
