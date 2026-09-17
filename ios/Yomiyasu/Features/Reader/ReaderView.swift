import Nuke
import SwiftUI
import UIKit
import os

struct ReaderView: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase

    let bookId: String

    @State private var book: Book?
    @State private var mokuro: MokuroBook?
    @State private var spreads: [ReaderSpread] = []
    @State private var initialSpreadIndex = 0
    @State private var currentSpreadIndex = 0
    @State private var navigateTo: Int?
    @State private var timer = ReadingTimer()
    @State private var isLoading = true
    @State private var error: String?
    @State private var showingBars = true
    @State private var showingSettings = false
    @State private var showingPageText = false
    @State private var readerAlert: ReaderAlert?
    @State private var currentBookId: String
    @State private var pagerID = UUID()
    @State private var localBaseURL: URL?

    private let logger = Logger(subsystem: "es.manabe.yomiyasu", category: "Reader")

    init(bookId: String) {
        self.bookId = bookId
        _currentBookId = State(initialValue: bookId)
    }

    private static var initialPageOverride: Int? {
        #if DEBUG
        if let raw = ProcessInfo.processInfo.environment["YOMIYASU_E2E_PAGE"],
           let page = Int(raw), page > 0 {
            return page - 1
        }
        #endif
        return nil
    }

    private static var progressSavingDisabled: Bool {
        #if DEBUG
        return ProcessInfo.processInfo.environment["YOMIYASU_E2E_NO_SAVE"] == "1"
        #else
        return false
        #endif
    }

    var body: some View {
        ZStack {
            Color.black
                .ignoresSafeArea()

            if let book, let mokuro, !spreads.isEmpty {
                pager(book: book, mokuro: mokuro)
            } else if isLoading {
                ProgressView()
                    .tint(.white)
            } else if let error {
                ContentUnavailableView(
                    "No se pudo abrir",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            }

            if showingBars, book != nil, mokuro != nil {
                VStack(spacing: 0) {
                    topBar
                    Spacer()
                    bottomBar
                }
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .statusBarHidden(!showingBars)
        .task(id: currentBookId) {
            await load()
        }
        .task {
            await progressLoop()
        }
        .onAppear {
            timer.idleTimeoutMinutes = environment.settings.idleTimeout
        }
        .onChange(of: environment.settings.idleTimeout) {
            timer.idleTimeoutMinutes = environment.settings.idleTimeout
        }
        .onChange(of: environment.readerSettings.doublePage) {
            rebuildSpreads()
        }
        .onChange(of: environment.readerSettings.hasCover) {
            rebuildSpreads()
        }
        .onDisappear {
            Task { await saveProgress() }
        }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .active:
                if environment.settings.autoCrono {
                    timer.start()
                }
            case .background, .inactive:
                timer.pause()
                Task { await saveProgress() }
            default:
                break
            }
        }
        .sheet(isPresented: $showingSettings) {
            ReaderSettingsView(showsOCR: book?.isImageFolder != true)
                .environment(environment)
        }
        .sheet(isPresented: $showingPageText) {
            PageTextView(pages: currentSpreadPages)
                .environment(environment)
        }
        .alert(item: $readerAlert) { alert in
            switch alert {
            case .noMoreVolumes:
                Alert(title: Text("No hay más volúmenes"))
            case .error(let message):
                Alert(title: Text("Error"), message: Text(message))
            }
        }
    }

    private func pager(book: Book, mokuro: MokuroBook) -> some View {
        ReaderPagerView(
            book: mokuro,
            spreads: spreads,
            initialIndex: initialSpreadIndex,
            staticPrefix: staticPrefix(for: book),
            seriePath: book.seriePath ?? "",
            baseURL: environment.api.baseURL,
            localBaseURL: localBaseURL,
            settings: environment.readerSettings,
            environment: environment,
            navigateTo: navigateTo,
            onSpreadChanged: { index in
                currentSpreadIndex = index
                timer.notifyActivity()
            },
            onToggleBars: {
                withAnimation(.easeInOut(duration: 0.2)) {
                    showingBars.toggle()
                }
            }
        )
        .id(pagerID)
        .ignoresSafeArea()
    }

    private var topBar: some View {
        HStack(spacing: 18) {
            Button {
                Task {
                    await saveProgress()
                    dismiss()
                }
            } label: {
                Image(systemName: "chevron.left")
            }
            .accessibilityLabel("Volver")

            Text(book?.visibleName ?? "")
                .font(.headline)
                .lineLimit(1)
                .accessibilityIdentifier("readerBookTitle")

            Spacer()

            if !environment.network.isOnline {
                Image(systemName: "wifi.slash")
                    .foregroundStyle(.orange)
                    .accessibilityLabel("Sin conexión: no se guarda el progreso")
            }

            downloadButton

            if book?.isImageFolder != true {
                Button {
                    showingPageText = true
                } label: {
                    Image(systemName: "text.justify.left")
                }
                .accessibilityLabel("Texto")
            }

            Button {
                showingSettings = true
            } label: {
                Image(systemName: "gearshape")
            }
            .accessibilityLabel("Ajustes")
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial)
    }

    private var bottomBar: some View {
        VStack(spacing: 8) {
            HStack(spacing: 18) {
                Button {
                    Task { await navigateVolume(forward: false) }
                } label: {
                    Image(systemName: "backward.end")
                }
                .accessibilityLabel("Volumen anterior")

                if environment.settings.showCrono {
                    Button {
                        if timer.isRunning {
                            timer.pause()
                        } else {
                            timer.start()
                        }
                    } label: {
                        Image(systemName: timer.isRunning ? "pause.fill" : "play.fill")
                    }
                    .accessibilityLabel(timer.isRunning ? "Pausar cronómetro" : "Iniciar cronómetro")

                    Text(timer.formatted)
                        .font(.caption)
                        .monospacedDigit()
                }

                Spacer()

                Text("\(currentPageNumber) / \(totalPages)")
                    .font(.caption)
                    .monospacedDigit()
                    .accessibilityIdentifier("readerPageLabel")

                Button {
                    Task { await navigateVolume(forward: true) }
                } label: {
                    Image(systemName: "forward.end")
                }
                .accessibilityLabel("Volumen siguiente")
            }

            Slider(
                value: Binding(
                    get: { Double(currentSpreadIndex) },
                    set: { newValue in
                        let index = Int(newValue)
                        currentSpreadIndex = index
                        navigateTo = index
                    }
                ),
                in: 0...Double(max(spreads.count - 1, 0)),
                step: 1
            )
            .accessibilityLabel("Página")
        }
        .padding(.horizontal)
        .padding(.top, 8)
        .padding(.bottom, 4)
        .background(.ultraThinMaterial)
    }

    @ViewBuilder
    private var downloadButton: some View {
        switch environment.downloads.state(for: currentBookId) {
        case .downloaded:
            Image(systemName: "arrow.down.circle.fill")
                .foregroundStyle(.green)
                .accessibilityLabel("Descargado")
        case .queued, .downloading:
            ProgressView()
                .controlSize(.small)
        case .notDownloaded, .failed:
            Button {
                if let book {
                    environment.downloads.enqueue(book)
                }
            } label: {
                Image(systemName: "arrow.down.circle")
            }
            .accessibilityLabel("Descargar")
        }
    }

    private var currentSpreadPages: [MokuroPage] {
        guard let mokuro, spreads.indices.contains(currentSpreadIndex) else { return [] }

        return spreads[currentSpreadIndex].pages.compactMap { index in
            mokuro.pages.indices.contains(index) ? mokuro.pages[index] : nil
        }
    }

    private var currentPageNumber: Int {
        guard spreads.indices.contains(currentSpreadIndex) else { return 1 }
        return spreads[currentSpreadIndex].firstPage + 1
    }

    private var totalPages: Int {
        mokuro?.pages.count ?? 0
    }

    private func staticPrefix(for book: Book) -> String {
        book.variant == .novela ? "novelas" : "mangas"
    }

    /// Rehace los spreads al cambiar «doble página» o «portada» desde los
    /// ajustes, conservando la página que se está leyendo. Sin esto el cambio
    /// no se aplicaba hasta salir y volver a abrir el tomo.
    private func rebuildSpreads() {
        guard let mokuro, !mokuro.pages.isEmpty else { return }

        let settings = environment.readerSettings
        let currentPage = spreads.indices.contains(currentSpreadIndex)
            ? spreads[currentSpreadIndex].firstPage
            : 0

        let layout = SpreadLayout.spreads(
            pageCount: mokuro.pages.count,
            doublePage: settings.doublePage,
            hasCover: settings.hasCover
        )
        let index = SpreadLayout.spreadIndex(
            forPage: currentPage,
            doublePage: settings.doublePage,
            hasCover: settings.hasCover
        )

        spreads = layout
        initialSpreadIndex = min(index, max(layout.count - 1, 0))
        currentSpreadIndex = initialSpreadIndex
        navigateTo = initialSpreadIndex
        pagerID = UUID()
    }

    /// Tamaño de la primera página de un tomo de imágenes, para maquetar los
    /// spreads antes de tener el resto decodificadas. Si falla se usa la
    /// proporción de reserva de `ImageFolderPages`.
    private func loadFirstPageSize(for book: Book, fileName: String, localBaseURL: URL?) async -> CGSize? {
        let url: URL

        if let localBaseURL {
            url = localBaseURL.appendingPathComponent(fileName)
        } else {
            url = StaticURLs.url(
                path: "\(staticPrefix(for: book))/\(book.seriePath ?? "")/\(fileName)",
                baseURL: environment.api.baseURL
            )
        }

        if url.isFileURL {
            return await Task.detached(priority: .userInitiated) {
                UIImage(contentsOfFile: url.path)?.size
            }.value
        }

        let request = ImageRequestFactory.make(url: url, token: environment.session.accessToken)

        guard let image = try? await ImagePipeline.shared.image(for: request) else {
            return nil
        }

        return image.size
    }

    private func load() async {
        isLoading = true
        error = nil
        showingBars = true
        timer.pause()
        timer.reset()

        do {
            let fetchedBook = try await environment.library.book(id: currentBookId)

            var imagesBaseURL: URL?

            if let record = environment.downloads.records[currentBookId] {
                imagesBaseURL = environment.downloads.localImagesDirectory(for: record.bookId)
                logger.info("Leyendo «\(record.visibleName, privacy: .public)» desde descarga local")
            }

            let parsed: MokuroBook

            if fetchedBook.isImageFolder {
                let pagePaths = fetchedBook.pagePaths ?? []
                guard !pagePaths.isEmpty else {
                    throw APIError.unexpectedResponse
                }

                let firstPageSize = await loadFirstPageSize(
                    for: fetchedBook,
                    fileName: ImageFolderPages.joinedPath(
                        imagesFolder: fetchedBook.imagesFolder,
                        fileName: pagePaths[0]
                    ),
                    localBaseURL: imagesBaseURL
                )
                parsed = ImageFolderPages.makeBook(
                    pagePaths: pagePaths,
                    imagesFolder: fetchedBook.imagesFolder,
                    firstPageSize: firstPageSize
                )
            } else {
                let htmlData: Data

                if let record = environment.downloads.records[currentBookId] {
                    htmlData = try Data(contentsOf: environment.downloads.localHTMLURL(for: record.bookId))
                } else {
                    let prefix = staticPrefix(for: fetchedBook)
                    let path = "\(prefix)/\(fetchedBook.seriePath ?? "")/\(fetchedBook.path ?? "").html"
                    htmlData = try await environment.api.sendData(.get("api/static/\(path)"))
                }

                guard let html = String(data: htmlData, encoding: .utf8) else {
                    throw APIError.unexpectedResponse
                }

                parsed = try await Task.detached(priority: .userInitiated) {
                    try MokuroParser.parse(html: html)
                }.value
            }

            guard !parsed.pages.isEmpty else {
                throw MokuroParserError.invalidHTML
            }

            let mirrorPage = UserDefaults.standard.integer(forKey: Self.mirrorPageKey(currentBookId))
            let mirrorTime = UserDefaults.standard.integer(forKey: Self.mirrorTimeKey(currentBookId))
            let progress = try? await environment.progress.progress(forBook: currentBookId)

            let layout = SpreadLayout.spreads(
                pageCount: parsed.pages.count,
                doublePage: environment.readerSettings.doublePage,
                hasCover: environment.readerSettings.hasCover
            )

            let startPage: Int
            let startTime: Int

            if let override = Self.initialPageOverride {
                startPage = override
                startTime = progress?.time ?? mirrorTime
            } else if let progress {
                startPage = max((progress.currentPage ?? 1) - 1, 0)
                startTime = progress.time ?? 0
            } else {
                startPage = max((mirrorPage == 0 ? 1 : mirrorPage) - 1, 0)
                startTime = mirrorTime
            }

            let startSpread = SpreadLayout.spreadIndex(
                forPage: startPage,
                doublePage: environment.readerSettings.doublePage,
                hasCover: environment.readerSettings.hasCover
            )

            book = fetchedBook
            mokuro = parsed
            spreads = layout
            localBaseURL = imagesBaseURL
            initialSpreadIndex = min(startSpread, max(layout.count - 1, 0))
            currentSpreadIndex = initialSpreadIndex
            navigateTo = initialSpreadIndex
            timer.resume(from: startTime)
            pagerID = UUID()

            if environment.settings.autoCrono {
                timer.start()
            }
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    private func progressLoop() async {
        while !Task.isCancelled {
            try? await Task.sleep(for: .seconds(60))
            guard !Task.isCancelled else { break }
            await saveProgress()
        }
    }

    private func saveProgress() async {
        guard !Self.progressSavingDisabled else { return }
        guard let book, !spreads.isEmpty else { return }

        let page = currentPageNumber
        guard page > 1 || timer.seconds > 0 else { return }

        UserDefaults.standard.set(page, forKey: Self.mirrorPageKey(book.id))
        UserDefaults.standard.set(timer.seconds, forKey: Self.mirrorTimeKey(book.id))

        guard environment.network.isOnline else { return }

        let characters: Int
        if let pageChars = book.pageChars, pageChars.indices.contains(page - 1) {
            characters = pageChars[page - 1]
        } else {
            characters = 0
        }

        let totalPages = book.pages ?? 0
        let status = totalPages > 0 && page >= totalPages ? "completed" : "reading"

        let request = ReadProgressRequest(
            book: book.id,
            time: timer.seconds,
            currentPage: page,
            characters: characters,
            status: status
        )

        try? await environment.progress.save(request)
    }

    private static func mirrorPageKey(_ bookId: String) -> String {
        "progressPage.\(bookId)"
    }

    private static func mirrorTimeKey(_ bookId: String) -> String {
        "progressTime.\(bookId)"
    }

    private func navigateVolume(forward: Bool) async {
        await saveProgress()

        do {
            if let neighboringBook = try await environment.progress.neighboringBook(
                of: currentBookId,
                forward: forward
            ) {
                currentBookId = neighboringBook.id
            } else {
                readerAlert = .noMoreVolumes
            }
        } catch {
            readerAlert = .error(error.localizedDescription)
        }
    }
}

private enum ReaderAlert: Identifiable {
    case noMoreVolumes
    case error(String)

    var id: String {
        switch self {
        case .noMoreVolumes: "noMoreVolumes"
        case .error(let message): "error-\(message)"
        }
    }
}
