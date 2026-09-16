import Foundation
import Observation
import SocketIO
import os

@MainActor
@Observable
final class SocketService {
    private(set) var isConnected = false
    private(set) var libraryUpdatedAt: Date?

    private var url: URL
    private let logger = Logger(subsystem: "es.manabe.yomiyasu", category: "SocketService")

    private var manager: SocketManager?
    private var socket: SocketIOClient?

    init(url: URL = APIClient.unconfiguredBaseURL) {
        self.url = url
    }

    func setURL(_ url: URL) {
        self.url = url
    }

    func start() {
        guard manager == nil, url != APIClient.unconfiguredBaseURL else { return }

        logger.info("Conectando al websocket \(self.url.absoluteString, privacy: .public)")

        let manager = SocketManager(
            socketURL: url,
            config: [
                .compress,
                .forceWebsockets(true),
                .path("/socket.io/"),
                .reconnects(true),
                .reconnectWait(2),
            ]
        )
        self.manager = manager

        let socket = manager.socket(forNamespace: "/ws")
        self.socket = socket

        socket.on(clientEvent: .connect) { [weak self] _, _ in
            Task { @MainActor in
                self?.isConnected = true
                self?.logger.info("Websocket conectado")
            }
        }

        socket.on(clientEvent: .disconnect) { [weak self] _, _ in
            Task { @MainActor in
                self?.isConnected = false
                self?.logger.info("Websocket desconectado")
            }
        }

        socket.on("notification") { [weak self] data, _ in
            Task { @MainActor in
                self?.handleNotification(data)
            }
        }

        socket.connect()
    }

    func stop() {
        socket?.disconnect()
        manager?.disconnect()
        socket = nil
        manager = nil
        isConnected = false
    }

    func handleNotification(_ data: [Any]) {
        guard let payload = data.first as? [String: Any],
              let action = payload["action"] as? String else {
            return
        }

        logger.info("Notificación recibida: \(action, privacy: .public)")

        if action == "LIBRARY_UPDATE" {
            libraryUpdatedAt = .now
        }
    }

    /// Provoca la recarga de las vistas que observan ``libraryUpdatedAt``
    /// tras una mutación local (marcar leído, leer más tarde, pausar serie…).
    func markLibraryUpdated() {
        libraryUpdatedAt = .now
    }
}
