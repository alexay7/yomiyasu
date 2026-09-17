@preconcurrency import ReadiumNavigator
@preconcurrency import ReadiumShared
import SwiftUI
import os

struct NovelReaderView: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.colorScheme) private var colorScheme

    let bookId: String

    @State private var book: Book?
    @State private var publication: Publication?
    @State private var progressMap: NovelProgressMap?
    @State private var initialLocator: Locator?
    @State private var navigateToLocator: Locator?
    @State private var maxCharacters = 0
    @State private var totalProgression = 0.0
    @State private var chapterTitle: String?
    @State private var tocLinks: [ReadiumShared.Link] = []
    @State private var timer = ReadingTimer()
    @State private var isLoading = true
    @State private var error: String?
    @State private var showingBars = true
    @State private var showingSettings = false
    @State private var showingTOC = false
    @State private var readerAlert: NovelReaderAlert?
    @State private var currentBookId: String
    @State private var navigatorID = UUID()

    private let logger = Logger(subsystem: "es.manabe.yomiyasu", category: "NovelReader")

    init(bookId: String) {
        self.bookId = bookId
        _currentBookId = State(initialValue: bookId)
    }

    private static var progressSavingDisabled: Bool {
        #if DEBUG
        return ProcessInfo.processInfo.environment["YOMIYASU_E2E_NO_SAVE"] == "1"
        #else
        return false
        #endif
    }

    private static var initialCharactersOverride: Int? {
        #if DEBUG
        if let raw = ProcessInfo.processInfo.environment["YOMIYASU_E2E_CHARACTERS"],
           let characters = Int(raw), characters > 0 {
            return characters
        }
        #endif
        return nil
    }

    var body: some View {
        ZStack {
            Color.black
                .ignoresSafeArea()

            if let publication, let map = progressMap {
                NovelNavigatorView(
                    publication: publication,
                    initialLocator: initialLocator,
                    preferenceState: preferenceState(hasVerticalText: map.containsVerticalText),
                    environment: environment,
                    navigateToLocator: navigateToLocator,
                    onLocatorChange: handleLocatorChange
                )
                .id(navigatorID)
                .ignoresSafeArea()
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

            if showingBars, publication != nil {
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
            ReaderSettingsView()
                .environment(environment)
        }
        .sheet(isPresented: $showingTOC) {
            tocSheet
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

            VStack(alignment: .leading, spacing: 1) {
                Text(book?.visibleName ?? "")
                    .font(.headline)
                    .lineLimit(1)
                    .accessibilityIdentifier("readerBookTitle")

                if let chapterTitle {
                    Text(chapterTitle)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            if !environment.network.isOnline {
                Image(systemName: "wifi.slash")
                    .foregroundStyle(.orange)
                    .accessibilityLabel("Sin conexión: no se guarda el progreso")
            }

            downloadButton

            Button {
                showingTOC = true
            } label: {
                Image(systemName: "list.bullet")
            }
            .accessibilityLabel("Índice")

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

            Text("\(Int((min(max(totalProgression, 0), 1)) * 100)) %")
                .font(.caption)
                .monospacedDigit()
                .accessibilityIdentifier("novelProgressLabel")

            Button {
                Task { await navigateVolume(forward: true) }
            } label: {
                Image(systemName: "forward.end")
            }
            .accessibilityLabel("Volumen siguiente")
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
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

    @ViewBuilder
    private var tocSheet: some View {
        NavigationStack {
            List {
                ForEach(Array(tocLinks.enumerated()), id: \.offset) { _, link in
                    Button {
                        goTo(link)
                    } label: {
                        Text(link.title ?? link.href)
                            .multilineTextAlignment(.leading)
                    }
                }
            }
            .navigationTitle("Índice")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Cerrar") {
                        showingTOC = false
                    }
                }
            }
        }
    }

    private static func flatten(_ links: [ReadiumShared.Link]) -> [ReadiumShared.Link] {
        links.flatMap { [$0] + flatten($0.children) }
    }

    private func preferenceState(hasVerticalText: Bool) -> NovelPreferenceState {
        let settings = environment.readerSettings

        let vertical: Bool
        switch settings.novelWritingMode {
        case .automatic: vertical = hasVerticalText
        case .horizontal: vertical = false
        case .vertical: vertical = true
        }

        let theme: Theme
        switch settings.novelTheme {
        case .system: theme = colorScheme == .light ? .light : .dark
        case .light: theme = .light
        case .dark: theme = .dark
        case .sepia: theme = .sepia
        }

        return NovelPreferenceState(
            fontSize: settings.novelFontSize,
            fontFamily: settings.novelFont,
            vertical: vertical,
            scroll: vertical ? false : settings.novelScroll,
            theme: theme
        )
    }

    private func handleLocatorChange(_ locator: Locator) {
        guard let map = progressMap else { return }

        timer.notifyActivity()

        let characters = map.characters(
            href: locator.href.string,
            progression: locator.locations.progression ?? 0
        )

        maxCharacters = max(maxCharacters, characters)

        if let total = locator.locations.totalProgression {
            totalProgression = total
        } else if map.totalCharacters > 0 {
            totalProgression = Double(maxCharacters) / Double(map.totalCharacters)
        }

        if let title = locator.title, !title.isEmpty {
            chapterTitle = title
        }
    }

    private func locator(
        forCharacters characters: Int,
        in publication: Publication,
        map: NovelProgressMap
    ) -> Locator? {
        guard let location = map.location(forCharacters: characters),
              let link = publication.readingOrder.first(where: {
                  $0.href == location.href
                      || $0.href.hasSuffix(location.href)
                      || location.href.hasSuffix($0.href)
              }) else {
            return nil
        }

        return Locator(
            href: link,
            mediaType: link.mediaType ?? .xhtml,
            locations: .init(progression: location.progression)
        )
    }

    private func goTo(_ link: ReadiumShared.Link) {
        guard let publication, let map = progressMap else { return }

        let href = link.href.split(separator: "#").first.map(String.init) ?? link.href

        guard let entry = map.entries.first(where: {
            $0.href.hasSuffix(href) || href.hasSuffix($0.href)
        }) else {
            return
        }

        if let locator = locator(forCharacters: entry.cumulativeBefore, in: publication, map: map) {
            navigateToLocator = locator
            showingTOC = false
        }
    }

    private func load() async {
        isLoading = true
        error = nil
        showingBars = true
        timer.pause()
        timer.reset()

        do {
            let fetchedBook = try await environment.library.book(id: currentBookId)

            let epubURL: URL

            if let record = environment.downloads.records[currentBookId] {
                epubURL = environment.downloads.localEpubURL(for: record.bookId)
                logger.info("Leyendo novela desde descarga local")
            } else {
                let path = "novelas/\(fetchedBook.seriePath ?? "")/\(fetchedBook.path ?? "").epub"
                let data = try await environment.api.sendData(.get("api/static/\(path)"))
                let tempURL = FileManager.default.temporaryDirectory
                    .appendingPathComponent("yomiyasu-novel-\(currentBookId).epub")
                try? FileManager.default.removeItem(at: tempURL)
                try data.write(to: tempURL)
                epubURL = tempURL
            }

            let opened = try await ReadiumAccess.shared.openPublication(at: epubURL)
            let map = await ReadiumAccess.shared.progressMap(for: opened)

            var tableOfContents: [ReadiumShared.Link] = []
            if case let .success(links) = await opened.tableOfContents() {
                tableOfContents = Self.flatten(links)
            }

            let mirrorCharacters = UserDefaults.standard.integer(
                forKey: Self.mirrorCharactersKey(currentBookId)
            )
            let mirrorTime = UserDefaults.standard.integer(forKey: Self.mirrorTimeKey(currentBookId))
            let progress = try? await environment.progress.progress(forBook: currentBookId)

            let startCharacters = Self.initialCharactersOverride
                ?? max(progress?.characters ?? mirrorCharacters, 0)
            let startTime = progress?.time ?? mirrorTime
            let locator = locator(forCharacters: startCharacters, in: opened, map: map)

            book = fetchedBook
            publication = opened
            progressMap = map
            tocLinks = tableOfContents
            initialLocator = locator
            navigateToLocator = locator
            maxCharacters = startCharacters
            totalProgression = map.totalCharacters > 0
                ? min(Double(startCharacters) / Double(map.totalCharacters), 1)
                : 0
            timer.resume(from: startTime)
            navigatorID = UUID()

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
        guard let book, let map = progressMap else { return }

        let characters = maxCharacters
        guard characters > 0 || timer.seconds > 0 else { return }

        UserDefaults.standard.set(characters, forKey: Self.mirrorCharactersKey(book.id))
        UserDefaults.standard.set(timer.seconds, forKey: Self.mirrorTimeKey(book.id))

        guard environment.network.isOnline else { return }

        let total = book.characters ?? map.totalCharacters
        let isCompleted = total > 0 && Double(characters) >= Double(total) * 0.9

        let request = ReadProgressRequest(
            book: book.id,
            time: timer.seconds,
            currentPage: 1,
            characters: characters,
            status: isCompleted ? "completed" : "reading"
        )

        try? await environment.progress.save(request)
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

    private static func mirrorCharactersKey(_ bookId: String) -> String {
        "novelProgressCharacters.\(bookId)"
    }

    private static func mirrorTimeKey(_ bookId: String) -> String {
        "novelProgressTime.\(bookId)"
    }
}

private enum NovelReaderAlert: Identifiable {
    case noMoreVolumes
    case error(String)

    var id: String {
        switch self {
        case .noMoreVolumes: "noMoreVolumes"
        case .error(let message): "error-\(message)"
        }
    }
}
