import Foundation

struct ErrorEnvelope: Decodable, Sendable {
    enum Kind: String, Decodable, Sendable {
        case access = "ACCESS"
        case refresh = "REFRESH"
        case none = "NONE"
    }

    let statusCode: Int
    let message: String?
    let status: Kind?

    private enum CodingKeys: String, CodingKey {
        case statusCode
        case message
        case status
    }

    init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        statusCode = (try? container.decode(Int.self, forKey: .statusCode)) ?? 0
        status = try? container.decode(Kind.self, forKey: .status)

        if let single = try? container.decode(String.self, forKey: .message) {
            message = single
        } else if let many = try? container.decode([String].self, forKey: .message) {
            message = many.joined(separator: "\n")
        } else {
            message = nil
        }
    }
}

enum APIError: LocalizedError {
    case invalidURL
    case transport(any Error)
    case unexpectedResponse
    case decoding(any Error)
    case http(status: Int, envelope: ErrorEnvelope?)
    case sessionExpired

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            "La dirección del servidor no es válida."
        case .transport:
            "No se ha podido conectar con el servidor."
        case .unexpectedResponse:
            "Respuesta inesperada del servidor."
        case .decoding:
            "No se ha podido leer la respuesta del servidor."
        case .http(let status, let envelope):
            envelope?.message ?? "Error del servidor (\(status))."
        case .sessionExpired:
            "La sesión ha caducado. Vuelve a iniciar sesión."
        }
    }
}
