import Nuke
import SwiftUI
import UIKit

struct BoxSelection: Equatable {
    let page: Int
    let box: Int
}

final class ReaderPagerController: UIViewController {
    private let pageController = UIPageViewController(
        transitionStyle: .scroll,
        navigationOrientation: .horizontal,
        options: nil
    )

    let book: MokuroBook
    let staticPrefix: String
    let seriePath: String
    let baseURL: URL
    let localBaseURL: URL?
    let settings: ReaderSettingsStore
    let environment: AppEnvironment

    private(set) var spreads: [ReaderSpread]
    private(set) var currentIndex: Int

    var onSpreadChanged: ((Int) -> Void)?
    var onToggleBars: (() -> Void)?

    private var prefetcher: ImagePrefetcher?
    private var isZoomed = false

    var selectedBox: BoxSelection? {
        didSet { visibleSpreadController?.selectedBox = selectedBox }
    }

    init(
        book: MokuroBook,
        spreads: [ReaderSpread],
        currentIndex: Int,
        staticPrefix: String,
        seriePath: String,
        baseURL: URL,
        localBaseURL: URL?,
        settings: ReaderSettingsStore,
        environment: AppEnvironment
    ) {
        self.book = book
        self.spreads = spreads
        self.currentIndex = min(max(currentIndex, 0), max(spreads.count - 1, 0))
        self.staticPrefix = staticPrefix
        self.seriePath = seriePath
        self.baseURL = baseURL
        self.localBaseURL = localBaseURL
        self.settings = settings
        self.environment = environment

        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .black

        addChild(pageController)
        pageController.view.frame = view.bounds
        pageController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        pageController.dataSource = self
        pageController.delegate = self
        pageController.view.semanticContentAttribute = settings.r2l
            ? .forceRightToLeft
            : .forceLeftToRight

        view.addSubview(pageController.view)
        pageController.didMove(toParent: self)

        let initial = makeSpreadController(index: currentIndex)
        pageController.setViewControllers([initial], direction: .forward, animated: false)

        loadImages(for: initial)
        prefetchPages(after: currentIndex)
    }

    func updateSettings() {
        pageController.view.semanticContentAttribute = settings.r2l
            ? .forceRightToLeft
            : .forceLeftToRight

        for controller in pageController.viewControllers ?? [] {
            (controller as? SpreadViewController)?.applySettings()
        }

        updatePagingEnabled()
    }

    func clearSelection() {
        selectedBox = nil
    }

    func goToSpread(index: Int, animated: Bool) {
        guard spreads.indices.contains(index) else { return }
        guard index != currentIndex || pageController.viewControllers?.isEmpty == true else {
            return
        }

        let direction = Self.navigationDirection(
            from: currentIndex,
            to: index,
            r2l: settings.r2l
        )
        let controller = makeSpreadController(index: index)

        pageController.setViewControllers([controller], direction: direction, animated: animated) { [weak self] _ in
            self?.currentIndex = index
            self?.onSpreadChanged?(index)
        }

        currentIndex = index
        selectedBox = nil
        loadImages(for: controller)
        prefetchPages(after: index)
    }

    static func navigationDirection(
        from currentIndex: Int,
        to targetIndex: Int,
        r2l: Bool
    ) -> UIPageViewController.NavigationDirection {
        let movesForward = targetIndex > currentIndex

        if r2l {
            // En lectura RTL la página siguiente está a la izquierda:
            // el contenido se desplaza hacia la derecha.
            return movesForward ? .reverse : .forward
        }

        return movesForward ? .forward : .reverse
    }

    private var visibleSpreadController: SpreadViewController? {
        pageController.viewControllers?.first as? SpreadViewController
    }

    private var internalScrollView: UIScrollView? {
        pageController.view.subviews.compactMap { $0 as? UIScrollView }.first
    }

    private func updatePagingEnabled() {
        internalScrollView?.isScrollEnabled = settings.scrollChange && !isZoomed
    }

    private func makeSpreadController(index: Int) -> SpreadViewController {
        let spread = spreads[index]
        let spreadView = ReaderSpreadView(spread: spread, book: book)
        spreadView.r2l = settings.r2l

        let controller = SpreadViewController(spreadIndex: index, spreadView: spreadView)
        controller.settings = settings
        controller.selectedBox = selectedBox

        controller.onPageTurn = { [weak self] forward in
            self?.turnPage(forward: forward)
        }

        controller.onToggleBars = { [weak self] in
            self?.onToggleBars?()
        }

        controller.onZoomChanged = { [weak self] isZoomed in
            self?.isZoomed = isZoomed
            self?.updatePagingEnabled()
        }

        controller.onBoxTapped = { [weak self] hit, page, pageView, anchorRect in
            self?.handleBoxTap(hit: hit, page: page, pageView: pageView, anchorRect: anchorRect)
        }

        return controller
    }

    private func turnPage(forward: Bool) {
        let target = forward ? currentIndex + 1 : currentIndex - 1
        goToSpread(index: target, animated: true)
    }

    private func pageURL(for page: MokuroPage) -> URL {
        let decodedPath = page.imagePath.removingPercentEncoding ?? page.imagePath

        if let localBaseURL {
            let localURL = localBaseURL.appendingPathComponent(decodedPath)

            // Descargas antiguas (o incompletas): si la imagen no está en local
            // se cae a la URL remota en lugar de dejar la página en blanco
            if FileManager.default.fileExists(atPath: localURL.path) {
                return localURL
            }
        }

        return StaticURLs.url(path: "\(staticPrefix)/\(seriePath)/\(decodedPath)", baseURL: baseURL)
    }

    private func imageRequest(for page: MokuroPage) -> ImageRequest {
        ImageRequestFactory.make(url: pageURL(for: page), token: environment.session.accessToken)
    }

    private func loadImages(for controller: SpreadViewController) {
        for pageIndex in controller.spreadView.spread.pages {
            guard book.pages.indices.contains(pageIndex) else { continue }
            let page = book.pages[pageIndex]
            let request = imageRequest(for: page)

            Task { [weak controller] in
                guard let image = try? await ImagePipeline.shared.image(for: request) else {
                    return
                }
                controller?.spreadView.setImage(image, forPageIndex: pageIndex)
            }
        }
    }

    private func prefetchPages(after index: Int) {
        let pageIndices = spreads.dropFirst(index + 1).prefix(3).flatMap(\.pages)
        let requests = pageIndices.compactMap { pageIndex -> ImageRequest? in
            guard book.pages.indices.contains(pageIndex) else { return nil }
            return imageRequest(for: book.pages[pageIndex])
        }

        guard !requests.isEmpty else { return }

        let prefetcher = ImagePrefetcher(pipeline: .shared)
        prefetcher.startPrefetching(with: requests)
        self.prefetcher = prefetcher
    }

    private func handleBoxTap(
        hit: MokuroBoxHit,
        page: MokuroPage,
        pageView: MokuroPageView,
        anchorRect: CGRect
    ) {
        guard settings.nativeDictionary else { return }

        selectedBox = BoxSelection(page: page.id, box: hit.box.id)

        if let presented = presentedViewController {
            presented.dismiss(animated: false) { [weak self] in
                self?.presentDictionary(hit: hit, page: page, pageView: pageView, anchorRect: anchorRect)
            }
            return
        }

        presentDictionary(hit: hit, page: page, pageView: pageView, anchorRect: anchorRect)
    }

    private func presentDictionary(
        hit: MokuroBoxHit,
        page: MokuroPage,
        pageView: MokuroPageView,
        anchorRect: CGRect
    ) {
        let paragraphIndex = min(hit.paragraphIndex, hit.box.paragraphs.count - 1)
        let paragraph = hit.box.paragraphs[paragraphIndex]

        let lookupText: String

        switch settings.dictionaryVersion {
        case .sentence:
            lookupText = paragraph.text
        case .word:
            let index = paragraph.text.index(
                paragraph.text.startIndex,
                offsetBy: min(hit.characterIndex, max(paragraph.text.count - 1, 0))
            )
            lookupText = String(paragraph.text[index...])
        }

        guard !lookupText.isEmpty else { return }

        DictionaryPresentation.present(
            text: lookupText,
            mode: settings.dictionaryVersion,
            from: self,
            sourceView: pageView,
            sourceRect: anchorRect,
            environment: environment,
            onDismiss: { [weak self] in
                guard let self, !self.settings.toggleOCRTextBoxes else { return }
                self.clearSelection()
            }
        )
    }
}

extension ReaderPagerController: UIPageViewControllerDataSource, UIPageViewControllerDelegate {
    func pageViewController(
        _ pageViewController: UIPageViewController,
        viewControllerBefore viewController: UIViewController
    ) -> UIViewController? {
        guard let controller = viewController as? SpreadViewController,
              controller.spreadIndex > 0 else {
            return nil
        }

        return makeSpreadController(index: controller.spreadIndex - 1)
    }

    func pageViewController(
        _ pageViewController: UIPageViewController,
        viewControllerAfter viewController: UIViewController
    ) -> UIViewController? {
        guard let controller = viewController as? SpreadViewController,
              controller.spreadIndex < spreads.count - 1 else {
            return nil
        }

        return makeSpreadController(index: controller.spreadIndex + 1)
    }

    func pageViewController(
        _ pageViewController: UIPageViewController,
        didFinishAnimating finished: Bool,
        previousViewControllers: [UIViewController],
        transitionCompleted completed: Bool
    ) {
        guard completed, let controller = visibleSpreadController else { return }

        currentIndex = controller.spreadIndex
        selectedBox = nil
        onSpreadChanged?(currentIndex)

        loadImages(for: controller)
        prefetchPages(after: currentIndex)
    }
}

extension ReaderPagerController: UIPopoverPresentationControllerDelegate {
    func adaptivePresentationStyle(
        for controller: UIPresentationController,
        traitCollection: UITraitCollection
    ) -> UIModalPresentationStyle {
        .none
    }
}

struct ReaderPagerView: UIViewControllerRepresentable {    let book: MokuroBook
    let spreads: [ReaderSpread]
    let initialIndex: Int
    let staticPrefix: String
    let seriePath: String
    let baseURL: URL
    let localBaseURL: URL?
    let settings: ReaderSettingsStore
    let environment: AppEnvironment
    let navigateTo: Int?
    var onSpreadChanged: (Int) -> Void
    var onToggleBars: () -> Void

    final class Coordinator {
        var lastKnownIndex: Int
        var lastHandledNavigation: Int?
        var onSpreadChanged: (Int) -> Void
        var onToggleBars: () -> Void

        init(
            initialIndex: Int,
            onSpreadChanged: @escaping (Int) -> Void,
            onToggleBars: @escaping () -> Void
        ) {
            lastKnownIndex = initialIndex
            self.onSpreadChanged = onSpreadChanged
            self.onToggleBars = onToggleBars
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(initialIndex: initialIndex, onSpreadChanged: onSpreadChanged, onToggleBars: onToggleBars)
    }

    func makeUIViewController(context: Context) -> ReaderPagerController {
        let controller = ReaderPagerController(
            book: book,
            spreads: spreads,
            currentIndex: initialIndex,
            staticPrefix: staticPrefix,
            seriePath: seriePath,
            baseURL: baseURL,
            localBaseURL: localBaseURL,
            settings: settings,
            environment: environment
        )

        controller.onSpreadChanged = { index in
            context.coordinator.lastKnownIndex = index
            context.coordinator.onSpreadChanged(index)
        }

        controller.onToggleBars = {
            context.coordinator.onToggleBars()
        }

        return controller
    }

    func updateUIViewController(_ controller: ReaderPagerController, context: Context) {
        controller.updateSettings()

        if let target = navigateTo, target != context.coordinator.lastHandledNavigation {
            context.coordinator.lastHandledNavigation = target

            if target != context.coordinator.lastKnownIndex {
                context.coordinator.lastKnownIndex = target
                controller.goToSpread(index: target, animated: false)
            }
        }

        context.coordinator.onSpreadChanged = onSpreadChanged
        context.coordinator.onToggleBars = onToggleBars
    }
}
