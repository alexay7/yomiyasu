import UIKit

final class MokuroPageView: UIView {
    let page: MokuroPage
    let overlayView: MokuroOverlayView

    private let imageView = UIImageView()

    init(page: MokuroPage) {
        self.page = page
        overlayView = MokuroOverlayView(page: page)
        super.init(frame: .zero)

        backgroundColor = .white
        clipsToBounds = true

        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        addSubview(imageView)
        addSubview(overlayView)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        imageView.frame = bounds
        overlayView.frame = bounds
    }

    func setImage(_ image: UIImage?) {
        imageView.image = image
        overlayView.setNeedsDisplay()
    }
}
