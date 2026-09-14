import Foundation
import Observation

@MainActor
@Observable
final class AppEnvironment {
    let api: APIClient
    let session: SessionStore
    let socket: SocketService
    let settings: AppSettings
    let readerSettings: ReaderSettingsStore
    let library: LibraryAPI
    let dictionary: DictionaryAPI
    let progress: ProgressAPI
    let downloads: DownloadManager
    let network: NetworkMonitor

    init() {
        let api = APIClient()
        let session = SessionStore(api: api)
        let socket = SocketService()
        let settings = AppSettings()
        let readerSettings = ReaderSettingsStore()

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
}
