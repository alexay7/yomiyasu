import CoreGraphics
import UIKit

final class ReaderSpreadView: UIView {
    let spread: ReaderSpread
    let book: MokuroBook
    let pageViews: [MokuroPageView]

    var r2l: Bool = true {
        didSet { setNeedsLayout() }
    }

    init(spread: ReaderSpread, book: MokuroBook) {
        self.spread = spread
        self.book = book
        pageViews = spread.pages.compactMap { index in
            book.pages.indices.contains(index) ? MokuroPageView(page: book.pages[index]) : nil
        }
        super.init(frame: .zero)

        backgroundColor = .black

        for pageView in pageViews {
            addSubview(pageView)
        }
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func layoutSubviews() {
        super.layoutSubviews()

        let layout = Self.pageRects(
            for: spread,
            book: book,
            in: bounds,
            r2l: r2l
        )

        for (index, pageView) in pageViews.enumerated() where index < layout.count {
            pageView.frame = layout[index]
        }
    }

    func setImage(_ image: UIImage?, forPageIndex bookPageIndex: Int) {
        guard let position = spread.pages.firstIndex(of: bookPageIndex),
              pageViews.indices.contains(position) else {
            return
        }

        pageViews[position].setImage(image)
    }

    static func pageRects(
        for spread: ReaderSpread,
        book: MokuroBook,
        in bounds: CGRect,
        r2l: Bool
    ) -> [CGRect] {
        let pageSizes = spread.pages.compactMap { index -> CGSize? in
            guard book.pages.indices.contains(index) else { return nil }
            let size = book.pages[index].size
            guard size.width > 0, size.height > 0 else { return nil }
            return size
        }

        guard !pageSizes.isEmpty, bounds.width > 0, bounds.height > 0 else {
            return []
        }

        let combinedWidth = pageSizes.reduce(0) { $0 + $1.width }
        let maxHeight = pageSizes.map(\.height).max() ?? 1
        let scale = min(bounds.width / combinedWidth, bounds.height / maxHeight)

        var rects: [CGRect] = []
        var x = (bounds.width - combinedWidth * scale) / 2

        for size in pageSizes {
            let width = size.width * scale
            let height = size.height * scale
            let rect = CGRect(
                x: x,
                y: (bounds.height - height) / 2,
                width: width,
                height: height
            )
            rects.append(rect)
            x += width
        }

        if r2l {
            return rects.reversed()
        }

        return rects
    }
}
