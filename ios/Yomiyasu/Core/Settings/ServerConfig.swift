import Foundation
import Observation

/// Servidor configurado por el usuario. No hay valor por defecto: sin servidor
/// no se puede iniciar sesión y el campo «Servidor» es obligatorio en el login.
///
/// Orden de resolución: override de desarrollo (solo DEBUG, vía
/// `YOMIYASU_SERVER_URL`) y, si no, la URL persistida por el usuario.
@MainActor
@Observable
final class ServerConfig {
    private enum Key {
        static let baseURL = "server.baseURL"
    }

    private let defaults: UserDefaults

    private(set) var baseURL: URL?

    var isConfigured: Bool { baseURL != nil }

    init(
        defaults: UserDefaults = .standard,
        environment: [String: String] = ProcessInfo.processInfo.environment
    ) {
        self.defaults = defaults

        #if DEBUG
        if let raw = environment["YOMIYASU_SERVER_URL"],
           let url = ServerConfig.parse(raw) {
            baseURL = url
            return
        }
        #endif

        if let raw = defaults.string(forKey: Key.baseURL) {
            baseURL = ServerConfig.parse(raw)
        }
    }

    /// Valida y normaliza la URL del servidor: admite `host[:puerto]` sin
    /// esquema (se asume https) y descarta path, query y fragmento.
    nonisolated static func parse(_ raw: String) -> URL? {
        var text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !text.contains(" ") else { return nil }

        if !text.contains("://") {
            text = "https://" + text
        }

        guard let components = URLComponents(string: text),
              let scheme = components.scheme?.lowercased(),
              scheme == "http" || scheme == "https",
              let host = components.host,
              !host.isEmpty else {
            return nil
        }

        var normalized = URLComponents()
        normalized.scheme = scheme
        normalized.host = host.lowercased()
        normalized.port = components.port
        return normalized.url
    }

    /// Persiste la URL si es válida. Devuelve `nil` cuando no lo es.
    @discardableResult
    func setServer(_ raw: String) -> URL? {
        guard let url = ServerConfig.parse(raw) else { return nil }

        baseURL = url
        defaults.set(url.absoluteString, forKey: Key.baseURL)
        return url
    }
}
