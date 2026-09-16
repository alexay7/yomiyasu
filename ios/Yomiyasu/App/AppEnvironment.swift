import Foundation
import Observation

@MainActor
@Observable
final class AppEnvironment {
    let server: ServerConfig
    let api: APIClient
    let session: SessionStore
    let socket: SocketService
    let settings: AppSettings
    let readerSettings: ReaderSettingsStore
    let randomCriteria = RandomCriteriaStore()
    let library: LibraryAPI
    let dictionary: DictionaryAPI
    let progress: ProgressAPI
    let downloads: DownloadManager
    let network: NetworkMonitor

    init(server: ServerConfig = ServerConfig()) {
        let baseURL = server.baseURL ?? APIClient.unconfiguredBaseURL
        let api = APIClient(baseURL: baseURL)
        let session = SessionStore(api: api)
        let socket = SocketService(url: baseURL)
        let settings = AppSettings()
        let readerSettings = ReaderSettingsStore()

        self.server = server
        self.api = api
        self.session = session
        self.socket = socket
        self.settings = settings
        self.readerSettings = readerSettings
        library = LibraryAPI(client: api)
        dictionary = DictionaryAPI(client: api)
        progress = ProgressAPI(client: api)
        downloads = DownloadManager(api: api)
        network = NetworkMonitor()

        session.onSessionChange = { isActive in
            if isActive {
                socket.start()
            } else {
                socket.stop()
            }
        }
    }

    func bootstrap() async {
        guard server.isConfigured else {
            session.clearLocalSession()
            return
        }

        await session.bootstrap()
    }

    /// Aplica una nueva URL de servidor: persiste, cierra la sesión local,
    /// detiene el websocket y reapunta los clientes al nuevo servidor.
    /// Devuelve `nil` si la URL no es válida.
    @discardableResult
    func applyServer(_ raw: String) -> URL? {
        guard let url = server.setServer(raw) else { return nil }

        let changed = url != api.baseURL
        guard changed else { return url }

        if case .loggedIn = session.state {
            session.clearLocalSession(notice: "Has cambiado de servidor. Vuelve a iniciar sesión.")
        }
        socket.stop()
        api.setBaseURL(url)
        socket.setURL(url)
        return url
    }
}
