@preconcurrency import ReadiumNavigator
@preconcurrency import ReadiumShared
import SwiftUI
import UIKit
import WebKit
import os

struct NovelPreferenceState: Equatable {
    var fontSize: Double
    var fontFamily: NovelFont
    var vertical: Bool
    var scroll: Bool
    var theme: Theme

    var epubPreferences: EPUBPreferences {
        var preferences = EPUBPreferences()
        preferences.fontSize = fontSize / 100
        preferences.scroll = scroll
        preferences.verticalText = vertical
        preferences.theme = theme
        preferences.fit = .page

        switch fontFamily {
        case .original:
            preferences.fontFamily = nil
        case .serif:
            preferences.fontFamily = .serif
        case .sans:
            preferences.fontFamily = .sansSerif
        }

        return preferences
    }
}

final class NovelNavigatorController: UIViewController {
    static let searchAction = EditingAction(
        title: "Buscar en Yomiyasu",
        action: #selector(NovelNavigatorController.searchSelectionAction(_:))
    )

    let navigator: EPUBNavigatorViewController

    var onLocatorChange: ((Locator) -> Void)?

    private let environment: AppEnvironment

    init(
        publication: Publication,
        initialLocator: Locator?,
        preferences: NovelPreferenceState,
        environment: AppEnvironment
    ) throws {
        self.environment = environment

        var config = EPUBNavigatorViewController.Configuration()
        config.preferences = preferences.epubPreferences
        config.editingActions = EditingAction.defaultActions + [Self.searchAction]
        config.contentInset = [
            .compact: (top: 10, bottom: 10),
            .regular: (top: 16, bottom: 16),
        ]

        navigator = try EPUBNavigatorViewController(
            publication: publication,
            initialLocation: initialLocator,
            config: config
        )

        super.init(nibName: nil, bundle: nil)

        navigator.delegate = self
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        addChild(navigator)
        navigator.view.frame = view.bounds
        navigator.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(navigator.view)
        navigator.didMove(toParent: self)
    }

    func submit(preferences: NovelPreferenceState) {
        navigator.submitPreferences(preferences.epubPreferences)
    }

    func go(to locator: Locator) {
        Task {
            _ = await navigator.go(to: locator, options: NavigatorGoOptions(animated: true))
        }
    }

    @objc private func searchSelectionAction(_ sender: Any?) {
        guard let selection = navigator.currentSelection,
              let text = selection.locator.text.highlight?
                  .trimmingCharacters(in: .whitespacesAndNewlines),
              !text.isEmpty else {
            return
        }

        DictionaryPresentation.present(
            text: text,
            mode: .sentence,
            from: self,
            sourceView: view,
            sourceRect: selection.frame,
            environment: environment
        )
    }
}

extension NovelNavigatorController: EPUBNavigatorDelegate {
    func navigator(
        _ navigator: EPUBNavigatorViewController,
        setupUserScripts userContentController: WKUserContentController
    ) {
        let css = "img, svg { max-width: 100vw !important; max-height: 100vh !important; object-fit: contain !important; }"

        let source = """
        (function() {
            var style = document.createElement('style');
            style.textContent = '\(css)';
            document.head.appendChild(style);
        })();
        """

        userContentController.addUserScript(
            WKUserScript(source: source, injectionTime: .atDocumentEnd, forMainFrameOnly: false)
        )
    }

    func navigator(_ navigator: Navigator, locationDidChange locator: Locator) {
        onLocatorChange?(locator)
    }

    func navigator(_ navigator: Navigator, presentError error: NavigatorError) {}

    func navigator(
        _ navigator: SelectableNavigator,
        canPerformAction action: EditingAction,
        for selection: Selection
    ) -> Bool {
        guard action == Self.searchAction else { return true }

        let count = selection.locator.text.highlight?.count ?? 0
        return count > 0 && count <= 30
    }
}

struct NovelNavigatorView: UIViewControllerRepresentable {
    let publication: Publication
    let initialLocator: Locator?
    let preferenceState: NovelPreferenceState
    let environment: AppEnvironment
    let navigateToLocator: Locator?
    var onLocatorChange: (Locator) -> Void

    final class Coordinator {
        var lastPreferenceState: NovelPreferenceState?
        var lastNavigatedKey: String?
        var onLocatorChange: (Locator) -> Void

        init(onLocatorChange: @escaping (Locator) -> Void) {
            self.onLocatorChange = onLocatorChange
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(onLocatorChange: onLocatorChange)
    }

    func makeUIViewController(context: Context) -> UIViewController {
        guard publication.conforms(to: .epub) else {
            return UIHostingController(
                rootView: ContentUnavailableView(
                    "Formato no compatible",
                    systemImage: "book.closed",
                    description: Text("Solo se admiten libros EPUB.")
                )
            )
        }

        do {
            let controller = try NovelNavigatorController(
                publication: publication,
                initialLocator: initialLocator,
                preferences: preferenceState,
                environment: environment
            )

            controller.onLocatorChange = { locator in
                context.coordinator.onLocatorChange(locator)
            }

            context.coordinator.lastPreferenceState = preferenceState

            return controller
        } catch {
            return UIHostingController(
                rootView: ContentUnavailableView(
                    "No se pudo abrir",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error.localizedDescription)
                )
            )
        }
    }

    func updateUIViewController(_ controller: UIViewController, context: Context) {
        guard let controller = controller as? NovelNavigatorController else { return }

        context.coordinator.onLocatorChange = onLocatorChange

        if context.coordinator.lastPreferenceState != preferenceState {
            context.coordinator.lastPreferenceState = preferenceState
            controller.submit(preferences: preferenceState)
        }

        if let target = navigateToLocator {
            let key = "\(target.href.string)#\(target.locations.progression ?? 0)"

            if key != context.coordinator.lastNavigatedKey {
                context.coordinator.lastNavigatedKey = key
                controller.go(to: target)
            }
        }
    }
}
