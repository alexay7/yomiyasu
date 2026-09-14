import CoreGraphics
import UIKit

struct MokuroBoxHit {
    let box: MokuroTextBox
    let paragraphIndex: Int
    let characterIndex: Int
    let boxFrame: CGRect
}

final class MokuroOverlayView: UIView {
    var page: MokuroPage {
        didSet { setNeedsDisplay() }
    }

    var settings: ReaderSettingsStore?

    var selectedBoxID: Int? {
        didSet { setNeedsDisplay() }
    }

    var highlightedBoxID: Int? {
        didSet { setNeedsDisplay() }
    }

    init(page: MokuroPage) {
        self.page = page
        super.init(frame: .zero)
        isOpaque = false
        backgroundColor = .clear
        isUserInteractionEnabled = false
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    var pageScale: CGFloat {
        guard page.size.width > 0 else { return 1 }
        return bounds.width / page.size.width
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        rebuildAccessibilityElements()
    }

    private func rebuildAccessibilityElements() {
        let scale = pageScale

        accessibilityElements = page.boxes.map { box -> UIAccessibilityElement in
            let element = UIAccessibilityElement(accessibilityContainer: self)
            element.accessibilityLabel = box.paragraphs.map(\.text).joined(separator: " ")
            element.accessibilityIdentifier = "ocrBox-\(page.id)-\(box.id)"
            element.accessibilityTraits = [.button, .staticText]
            element.accessibilityFrameInContainerSpace = CGRect(
                x: box.rect.minX * scale,
                y: box.rect.minY * scale,
                width: box.rect.width * scale,
                height: box.rect.height * scale
            )
            return element
        }
    }

    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext(), let settings else { return }

        let scale = pageScale
        let baseFont = TategakiRenderer.baseFont(named: settings.font.fontName)

        for box in page.boxes {
            let isSelected = box.id == selectedBoxID
            let isHighlighted = box.id == highlightedBoxID
            let showText = settings.displayOCR || isSelected

            guard showText || isHighlighted || settings.textBoxBorders else { continue }

            let style = MokuroTextStyle(
                font: baseFont,
                fontSizeOverride: CGFloat(settings.fontSize),
                scale: scale,
                showBackground: showText,
                showBorders: settings.textBoxBorders,
                isSelected: isSelected
            )

            TategakiRenderer.draw(
                textBox: box,
                in: context,
                style: style,
                highlighted: isHighlighted
            )
        }
    }

    func hitTestBox(at point: CGPoint) -> MokuroBoxHit? {
        let scale = pageScale
        guard scale > 0 else { return nil }

        let pagePoint = CGPoint(x: point.x / scale, y: point.y / scale)

        for box in page.boxes.reversed() where box.rect.contains(pagePoint) {
            return makeHit(for: box, at: pagePoint)
        }

        return nil
    }

    private func makeHit(for box: MokuroTextBox, at point: CGPoint) -> MokuroBoxHit {
        let scale = pageScale
        let baseFont = TategakiRenderer.baseFont(named: settings?.font.fontName)
        let fontSize = TategakiRenderer.effectiveFontSize(
            boxFontSize: box.fontSize,
            override: settings.map { CGFloat($0.fontSize) } ?? 0,
            scale: scale
        )

        let located = TategakiRenderer.locate(
            textBox: box,
            pagePoint: point,
            scale: scale,
            font: baseFont.withSize(fontSize)
        )

        return MokuroBoxHit(
            box: box,
            paragraphIndex: located?.paragraphIndex ?? 0,
            characterIndex: located?.characterIndex ?? 0,
            boxFrame: TategakiRenderer.displayRect(for: box, scale: scale)
        )
    }

    func overlayFrameInPage(for box: MokuroTextBox) -> CGRect {
        TategakiRenderer.displayRect(for: box, scale: pageScale)
    }
}
