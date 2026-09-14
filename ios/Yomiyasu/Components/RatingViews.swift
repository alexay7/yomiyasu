import SwiftUI

extension Color {
    init(hex: String) {
        var value: UInt64 = 0
        let cleaned = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        Scanner(string: cleaned).scanHexInt64(&value)

        self.init(
            .sRGB,
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255
        )
    }
}

struct DifficultyFlame: View {
    let difficulty: Double

    private static let colors = [
        "#0074D9",
        "#3498DB",
        "#5DADE2",
        "#2ED16F",
        "#6AAA0B",
        "#E67E22",
        "#F39C12",
        "#F9690E",
        "#E74C3C",
        "#C0392B",
        "#8E44AD",
    ]

    static func color(for difficulty: Double) -> Color {
        guard difficulty > 0 else { return .secondary }
        let index = max(0, min(colors.count - 1, Int(difficulty.rounded())))
        return Color(hex: colors[index])
    }

    var body: some View {
        Image(systemName: "flame.fill")
            .foregroundStyle(Self.color(for: difficulty))
            .accessibilityLabel("Dificultad \(difficulty, format: .number.precision(.fractionLength(1)))")
    }
}

struct StarRating: View {
    let valoration: Double

    var body: some View {
        let stars = valoration / 2

        HStack(spacing: 1) {
            ForEach(0..<5, id: \.self) { index in
                Image(systemName: symbol(at: index, stars: stars))
                    .foregroundStyle(.yellow)
                    .font(.caption2)
            }
        }
        .accessibilityLabel("Valoración \(valoration, format: .number.precision(.fractionLength(1))) de 10")
    }

    private func symbol(at index: Int, stars: Double) -> String {
        let threshold = Double(index)
        if stars >= threshold + 1 {
            return "star.fill"
        }
        if stars >= threshold + 0.5 {
            return "star.leadinghalf.filled"
        }
        return "star"
    }
}
