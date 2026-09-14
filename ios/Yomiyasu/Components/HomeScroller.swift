import SwiftUI

struct HomeScroller<Content: View>: View {
    let title: String
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
                .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(alignment: .top, spacing: 12) {
                    content()
                }
                .padding(.horizontal)
            }
        }
    }
}

struct HomeEmptyScroller: View {
    let title: String

    var body: some View {
        HomeScroller(title: title) {
            Text("Nada por aquí.")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .padding(.vertical, 20)
        }
    }
}
