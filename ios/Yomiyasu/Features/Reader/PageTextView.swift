import SwiftUI

struct PageTextView: View {
    let pages: [MokuroPage]

    private var hasText: Bool {
        pages.contains { !$0.boxes.isEmpty }
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(pages) { page in
                    if !page.boxes.isEmpty {
                        Section("Página \(page.id + 1)") {
                            ForEach(page.boxes) { box in
                                ForEach(box.paragraphs) { paragraph in
                                    NavigationLink {
                                        DictionaryLookupView(
                                            text: paragraph.text,
                                            mode: .sentence
                                        )
                                        .navigationTitle("Diccionario")
                                        .navigationBarTitleDisplayMode(.inline)
                                    } label: {
                                        Text(paragraph.text)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .overlay {
                if !hasText {
                    ContentUnavailableView(
                        "Sin texto OCR",
                        systemImage: "text.magnifyingglass"
                    )
                }
            }
            .navigationTitle("Texto de la página")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
