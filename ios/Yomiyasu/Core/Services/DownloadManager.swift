import Foundation
import Observation
import os

struct DownloadRecord: Codable, Sendable, Identifiable, Equatable {
    let bookId: String
    let visibleName: String
    let variant: String
    let downloadedAt: Date
    let byteCount: Int64
    let pageCount: Int

    var id: String { bookId }
}

enum DownloadState: Equatable {
    case notDownloaded
    case queued
    case downloading(progress: Double, detail: String)
    case downloaded
    case failed(String)
}

struct ActiveDownload: Identifiable, Equatable {
    let bookId: String
    let name: String
    let progress: Double
    let detail: String
    let isQueued: Bool

    var id: String { bookId }
}

@MainActor
@Observable
final class DownloadManager {
    private(set) var records: [String: DownloadRecord] = [:]
    private(set) var states: [String: DownloadState] = [:]

    private let api: APIClient
    private let rootURL: URL
    private let logger = Logger(subsystem: "es.manabe.yomiyasu", category: "Downloads")

    private var queue: [Book] = []
    private var activeBookIds: [String] = []
    private var bookNames: [String: String] = [:]
    private var activeBookId: String?
    private var currentTask: Task<Void, Never>?

    init(api: APIClient, rootURL: URL? = nil) {
        self.api = api
        self.rootURL = rootURL ?? Self.defaultRootURL()

        try? FileManager.default.createDirectory(
            at: self.rootURL,
            withIntermediateDirectories: true
        )

        loadManifest()
    }

    private static func defaultRootURL() -> URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory

        return base
            .appendingPathComponent("Yomiyasu", isDirectory: true)
            .appendingPathComponent("Downloads", isDirectory: true)
    }

    var sortedRecords: [DownloadRecord] {
        records.values.sorted { $0.downloadedAt > $1.downloadedAt }
    }

    var totalBytes: Int64 {
        records.values.reduce(0) { $0 + $1.byteCount }
    }

    var active: [ActiveDownload] {
        activeBookIds.compactMap { bookId in
            guard let name = bookNames[bookId] else { return nil }

            switch state(for: bookId) {
            case .queued:
                return ActiveDownload(
                    bookId: bookId,
                    name: name,
                    progress: 0,
                    detail: "En cola",
                    isQueued: true
                )
            case .downloading(let progress, let detail):
                return ActiveDownload(
                    bookId: bookId,
                    name: name,
                    progress: progress,
                    detail: detail,
                    isQueued: false
                )
            default:
                return nil
            }
        }
    }

    func state(for bookId: String) -> DownloadState {
        if let state = states[bookId] {
            return state
        }

        return records[bookId] != nil ? .downloaded : .notDownloaded
    }

    func isDownloaded(_ bookId: String) -> Bool {
        records[bookId] != nil
    }

    func bookDirectory(_ bookId: String) -> URL {
        rootURL.appendingPathComponent(bookId, isDirectory: true)
    }

    func localHTMLURL(for bookId: String) -> URL {
        bookDirectory(bookId).appendingPathComponent("book.html")
    }

    func localEpubURL(for bookId: String) -> URL {
        bookDirectory(bookId).appendingPathComponent("book.epub")
    }

    func localImagesDirectory(for bookId: String) -> URL {
        bookDirectory(bookId).appendingPathComponent("images", isDirectory: true)
    }

    func enqueue(_ book: Book) {
        guard records[book.id] == nil else { return }
        guard !queue.contains(where: { $0.id == book.id }) else { return }
        guard !(states[book.id]?.isActive ?? false) else { return }

        states[book.id] = .queued
        bookNames[book.id] = book.visibleName
        activeBookIds.append(book.id)
        queue.append(book)

        processQueue()
    }

    func enqueueSeries(_ books: [Book]) {
        for book in books {
            enqueue(book)
        }
    }

    func cancel(_ bookId: String) {
        queue.removeAll { $0.id == bookId }

        if activeBookId == bookId {
            currentTask?.cancel()
        } else {
            states[bookId] = .notDownloaded
            activeBookIds.removeAll { $0 == bookId }
            bookNames.removeValue(forKey: bookId)
        }
    }

    func delete(_ bookId: String) {
        cancel(bookId)
        try? FileManager.default.removeItem(at: bookDirectory(bookId))
        records.removeValue(forKey: bookId)
        states[bookId] = .notDownloaded
        saveManifest()
    }

    private func processQueue() {
        guard currentTask == nil, !queue.isEmpty else { return }

        let book = queue.removeFirst()
        activeBookId = book.id

        currentTask = Task { [weak self] in
            await self?.performDownload(book: book)
            self?.currentTask = nil
            self?.activeBookId = nil
            self?.activeBookIds.removeAll { $0 == book.id }
            self?.bookNames.removeValue(forKey: book.id)
            self?.processQueue()
        }
    }

    private func performDownload(book: Book) async {
        states[book.id] = .downloading(progress: 0, detail: "Preparando…")

        do {
            switch book.variant {
            case .novela:
                try await downloadNovel(book: book)
            default:
                if book.isImageFolder {
                    try await downloadImageFolder(book: book)
                } else {
                    try await downloadManga(book: book)
                }
            }
        } catch is CancellationError {
            logger.info("Descarga cancelada: \(book.visibleName, privacy: .public)")
            states[book.id] = .notDownloaded
            try? FileManager.default.removeItem(at: bookDirectory(book.id))
        } catch {
            logger.error("Descarga fallida: \(error.localizedDescription, privacy: .public)")
            states[book.id] = .failed(error.localizedDescription)
            try? FileManager.default.removeItem(at: bookDirectory(book.id))
        }
    }

    private func downloadManga(book: Book) async throws {
        guard let seriePath = book.seriePath, let bookPath = book.path else {
            throw APIError.unexpectedResponse
        }

        let htmlData = try await api.sendData(
            .get("api/static/mangas/\(seriePath)/\(bookPath).html")
        )

        guard let html = String(data: htmlData, encoding: .utf8) else {
            throw APIError.unexpectedResponse
        }

        let parsed = try await Task.detached(priority: .utility) {
            try MokuroParser.parse(html: html)
        }.value

        let directory = bookDirectory(book.id)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try htmlData.write(to: localHTMLURL(for: book.id))

        var bytes = Int64(htmlData.count)

        for (index, page) in parsed.pages.enumerated() {
            try Task.checkCancellation()

            let decodedPath = page.imagePath.removingPercentEncoding ?? page.imagePath
            let data = try await api.sendData(
                .get("api/static/mangas/\(seriePath)/\(decodedPath)")
            )

            let destination = localImagesDirectory(for: book.id)
                .appendingPathComponent(decodedPath)
            try FileManager.default.createDirectory(
                at: destination.deletingLastPathComponent(),
                withIntermediateDirectories: true
            )
            try data.write(to: destination)

            bytes += Int64(data.count)

            let progress = Double(index + 1) / Double(max(parsed.pages.count, 1))
            let size = ByteCountFormatter.string(fromByteCount: bytes, countStyle: .file)
            states[book.id] = .downloading(
                progress: progress,
                detail: "\(index + 1)/\(parsed.pages.count) pág. · \(size)"
            )
        }

        finish(
            DownloadRecord(
                bookId: book.id,
                visibleName: book.visibleName,
                variant: book.variant?.rawValue ?? "manga",
                downloadedAt: .now,
                byteCount: bytes,
                pageCount: parsed.pages.count
            )
        )
    }

    /// Tomo sin mokuro: no hay html que parsear, el manifiesto de páginas
    /// viene en el detalle del libro (los listados no lo incluyen).
    private func downloadImageFolder(book: Book) async throws {
        guard let seriePath = book.seriePath else {
            throw APIError.unexpectedResponse
        }

        let detail: Book = try await api.send(.get("api/books/book/\(book.id)"))
        let pagePaths = detail.pagePaths ?? []

        guard !pagePaths.isEmpty else {
            throw APIError.unexpectedResponse
        }

        let directory = bookDirectory(book.id)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)

        var bytes: Int64 = 0

        for (index, fileName) in pagePaths.enumerated() {
            try Task.checkCancellation()

            let data = try await api.sendData(
                .get("api/static/mangas/\(seriePath)/\(fileName)")
            )

            // Misma estructura que en las descargas de mokuro: la imagen se
            // guarda bajo la carpeta del tomo, que es lo que espera el lector
            let destination = localImagesDirectory(for: book.id)
                .appendingPathComponent(
                    ImageFolderPages.joinedPath(
                        imagesFolder: detail.imagesFolder,
                        fileName: fileName
                    )
                )
            try FileManager.default.createDirectory(
                at: destination.deletingLastPathComponent(),
                withIntermediateDirectories: true
            )
            try data.write(to: destination)

            bytes += Int64(data.count)

            let progress = Double(index + 1) / Double(max(pagePaths.count, 1))
            let size = ByteCountFormatter.string(fromByteCount: bytes, countStyle: .file)
            states[book.id] = .downloading(
                progress: progress,
                detail: "\(index + 1)/\(pagePaths.count) pág. · \(size)"
            )
        }

        finish(
            DownloadRecord(
                bookId: book.id,
                visibleName: book.visibleName,
                variant: book.variant?.rawValue ?? "manga",
                downloadedAt: .now,
                byteCount: bytes,
                pageCount: pagePaths.count
            )
        )
    }

    private func downloadNovel(book: Book) async throws {
        guard let seriePath = book.seriePath, let bookPath = book.path else {
            throw APIError.unexpectedResponse
        }

        let data = try await api.sendData(
            .get("api/static/novelas/\(seriePath)/\(bookPath).epub")
        )

        try Task.checkCancellation()

        let directory = bookDirectory(book.id)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try data.write(to: localEpubURL(for: book.id))

        finish(
            DownloadRecord(
                bookId: book.id,
                visibleName: book.visibleName,
                variant: book.variant?.rawValue ?? "novela",
                downloadedAt: .now,
                byteCount: Int64(data.count),
                pageCount: 0
            )
        )
    }

    private func finish(_ record: DownloadRecord) {
        records[record.bookId] = record
        states[record.bookId] = .downloaded
        saveManifest()
        logger.info("Descarga completada: \(record.visibleName, privacy: .public)")
    }

    private var manifestURL: URL {
        rootURL.appendingPathComponent("manifest.json")
    }

    private func loadManifest() {
        guard let data = try? Data(contentsOf: manifestURL),
              let list = try? JSONDecoder().decode([DownloadRecord].self, from: data) else {
            return
        }

        records = Dictionary(uniqueKeysWithValues: list.map { ($0.bookId, $0) })
    }

    private func saveManifest() {
        let list = sortedRecords

        guard let data = try? JSONEncoder().encode(list) else { return }
        try? data.write(to: manifestURL)
    }
}

private extension DownloadState {
    var isActive: Bool {
        switch self {
        case .queued, .downloading: true
        default: false
        }
    }
}
