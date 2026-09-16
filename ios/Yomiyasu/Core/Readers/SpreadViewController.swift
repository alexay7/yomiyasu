import UIKit

final class SpreadViewController: UIViewController, UIScrollViewDelegate {
    let spreadIndex: Int
    let spreadView: ReaderSpreadView

    var settings: ReaderSettingsStore?

    var onPageTurn: ((Bool) -> Void)?
    var onToggleBars: (() -> Void)?
    var onZoomChanged: ((Bool) -> Void)?
    var onBoxTapped: ((MokuroBoxHit, MokuroPage, MokuroPageView, CGRect) -> Void)?

    var selectedBox: BoxSelection? {
        didSet { updateSelection() }
    }

    var highlightedBox: BoxSelection? {
        didSet { updateSelection() }
    }

    private let zoomScrollView = UIScrollView()
    private var didApplyInitialZoom = false

    init(spreadIndex: Int, spreadView: ReaderSpreadView) {
        self.spreadIndex = spreadIndex
        self.spreadView = spreadView
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .black

        zoomScrollView.frame = view.bounds
        zoomScrollView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        zoomScrollView.delegate = self
        zoomScrollView.minimumZoomScale = 1
        zoomScrollView.maximumZoomScale = 6
        zoomScrollView.bouncesZoom = true
        zoomScrollView.showsHorizontalScrollIndicator = false
        zoomScrollView.showsVerticalScrollIndicator = false
        zoomScrollView.contentInsetAdjustmentBehavior = .never

        spreadView.frame = zoomScrollView.bounds
        spreadView.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        zoomScrollView.addSubview(spreadView)
        view.addSubview(zoomScrollView)

        let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap(_:)))
        spreadView.addGestureRecognizer(tap)

        applySettings()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()

        zoomScrollView.contentSize = CGSize(
            width: max(zoomScrollView.bounds.width, spreadView.frame.width),
            height: max(zoomScrollView.bounds.height, spreadView.frame.height)
        )

        guard !didApplyInitialZoom, zoomScrollView.bounds.width > 0 else { return }
        didApplyInitialZoom = true
        applyZoomMode(settings?.defaultZoomMode ?? .fitScreen)
    }

    func applySettings() {
        guard isViewLoaded else { return }
        spreadView.r2l = settings?.r2l ?? true
        applyZoomModeIfNeeded()
        applyPanAndZoom()
        updateSelection()
    }

    private func applyPanAndZoom() {
        let enabled = settings?.panAndZoom ?? true

        zoomScrollView.pinchGestureRecognizer?.isEnabled = enabled
        zoomScrollView.panGestureRecognizer.isEnabled = enabled
        zoomScrollView.isScrollEnabled = enabled
    }

    func applyZoomMode(_ mode: ZoomMode) {
        guard isViewLoaded else { return }

        switch mode {
        case .fitScreen, .original:
            zoomScrollView.setZoomScale(1, animated: false)
        case .fitWidth:
            let content = spreadView.subviews
                .map(\.frame)
                .reduce(CGRect.null) { $0.union($1) }
            let factor = content.width > 0
                ? zoomScrollView.bounds.width / content.width
                : 1
            zoomScrollView.setZoomScale(max(1, factor), animated: false)
        case .keep:
            break
        }

        notifyZoomChanged()
    }

    private func applyZoomModeIfNeeded() {
        guard didApplyInitialZoom else { return }
        if settings?.defaultZoomMode != .keep {
            applyZoomMode(settings?.defaultZoomMode ?? .fitScreen)
        }
    }

    private func notifyZoomChanged() {
        onZoomChanged?(zoomScrollView.zoomScale > 1.01)
    }

    private func updateSelection() {
        guard isViewLoaded else { return }

        for pageView in spreadView.pageViews {
            pageView.overlayView.settings = settings
            pageView.overlayView.selectedBoxID = selectedBox?.page == pageView.page.id
                ? selectedBox?.box
                : nil
            pageView.overlayView.highlightedBoxID = highlightedBox?.page == pageView.page.id
                ? highlightedBox?.box
                : nil
        }
    }

    @objc private func handleTap(_ gesture: UITapGestureRecognizer) {
        let point = gesture.location(in: spreadView)

        for pageView in spreadView.pageViews {
            let overlayPoint = pageView.overlayView.convert(point, from: spreadView)

            guard pageView.overlayView.bounds.contains(overlayPoint) else { continue }

            if let hit = pageView.overlayView.hitTestBox(at: overlayPoint) {
                let anchorRect = pageView.overlayView.overlayFrameInPage(for: hit.box)
                let anchorInPage = pageView.convert(anchorRect, from: pageView.overlayView)
                onBoxTapped?(hit, pageView.page, pageView, anchorInPage)
                return
            }
        }

        let third = spreadView.bounds.width / 3
        let isRTL = settings?.r2l ?? true

        if point.x < third {
            onPageTurn?(isRTL)
        } else if point.x > third * 2 {
            onPageTurn?(!isRTL)
        } else {
            onToggleBars?()
        }
    }

    func viewForZooming(in scrollView: UIScrollView) -> UIView? {
        spreadView
    }

    func scrollViewDidZoom(_ scrollView: UIScrollView) {
        scrollView.contentSize = CGSize(
            width: max(scrollView.bounds.width, spreadView.frame.width),
            height: max(scrollView.bounds.height, spreadView.frame.height)
        )
        notifyZoomChanged()
    }

    func scrollViewDidEndZooming(_ scrollView: UIScrollView, with view: UIView?, atScale scale: CGFloat) {
        let factor = min(max(scale, 1), 2) * traitCollection.displayScale

        for pageView in spreadView.pageViews {
            pageView.overlayView.contentScaleFactor = factor
            pageView.overlayView.setNeedsDisplay()
        }

        notifyZoomChanged()
    }
}
