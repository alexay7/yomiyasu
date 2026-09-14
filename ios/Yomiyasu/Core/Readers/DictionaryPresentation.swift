import SwiftUI
import UIKit

@MainActor
enum DictionaryPresentation {
    private final class PresentationDelegate: NSObject, UIPopoverPresentationControllerDelegate {
        var onDismiss: (() -> Void)?

        func adaptivePresentationStyle(
            for controller: UIPresentationController,
            traitCollection: UITraitCollection
        ) -> UIModalPresentationStyle {
            .none
        }

        func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
            onDismiss?()
        }
    }

    private static var activeDelegate: PresentationDelegate?

    static func present(
        text: String,
        mode: DictionaryLookupMode,
        from presenter: UIViewController,
        sourceView: UIView?,
        sourceRect: CGRect?,
        environment: AppEnvironment,
        onDismiss: (() -> Void)? = nil
    ) {
        let delegate = PresentationDelegate()
        delegate.onDismiss = onDismiss
        activeDelegate = delegate

        let view = DictionaryLookupView(text: text, mode: mode)
            .environment(environment)
        let host = UIHostingController(rootView: view)
        host.navigationItem.title = "Diccionario"

        let navigation = UINavigationController(rootViewController: host)
        navigation.navigationBar.prefersLargeTitles = false
        host.navigationItem.rightBarButtonItem = UIBarButtonItem(
            systemItem: .close,
            primaryAction: UIAction { [weak navigation] _ in
                onDismiss?()
                navigation?.dismiss(animated: true)
            }
        )

        if presenter.traitCollection.horizontalSizeClass == .regular,
           let sourceView,
           let sourceRect {
            navigation.modalPresentationStyle = .popover
            if let popover = navigation.popoverPresentationController {
                popover.sourceView = sourceView
                popover.sourceRect = sourceRect
                popover.permittedArrowDirections = [.up, .down]
                popover.delegate = delegate
            }
            presenter.present(navigation, animated: true) {
                navigation.presentationController?.delegate = delegate
            }
        } else {
            navigation.modalPresentationStyle = .pageSheet
            if let sheet = navigation.sheetPresentationController {
                sheet.detents = [.medium(), .large()]
                sheet.prefersGrabberVisible = true
            }
            presenter.present(navigation, animated: true) {
                navigation.presentationController?.delegate = delegate
            }
        }
    }
}
