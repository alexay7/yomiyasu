import SwiftUI

struct PitchAccentView: View {
    let reading: String
    let pitchPositions: [Int]

    var body: some View {
        let morae = JapaneseMorae.split(reading)
        let accent = pitchPositions.first ?? 0
        let pattern = JapaneseMorae.accentPattern(moraeCount: morae.count, accent: accent)

        HStack(spacing: 0) {
            ForEach(morae.indices, id: \.self) { index in
                VStack(spacing: 1) {
                    Rectangle()
                        .fill(.primary)
                        .frame(height: 2)
                        .opacity(index < pattern.count && pattern[index] ? 1 : 0)

                    Text(morae[index])
                        .font(.subheadline)
                }
                .padding(.horizontal, 1)
            }

            if !pitchPositions.isEmpty {
                Text("[\(pitchPositions.map(String.init).joined(separator: ","))]")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .padding(.leading, 6)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
            "Acento tonal \(pitchPositions.map(String.init).joined(separator: ", ")), \(reading)"
        )
    }
}
