import SwiftUI

extension Int {
    var durationText: String {
        let hours = self / 3600
        let minutes = (self % 3600) / 60

        if hours > 0 {
            return "\(hours) h \(minutes) min"
        }

        if minutes > 0 {
            return "\(minutes) min"
        }

        return "\(self) s"
    }
}

struct LogRow: View {
    let record: ProgressRecord

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(record.bookName)
                .font(.subheadline.bold())
                .lineLimit(2)

            if !record.serieName.isEmpty {
                Text(record.serieName)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 10) {
                if let date = record.lastUpdateDate {
                    Text(date.formatted(date: .abbreviated, time: .shortened))
                }

                if let time = record.time, time > 0 {
                    Text(time.durationText)
                }

                switch record.resolvedVariant {
                case .manga:
                    Text("pág. \(record.currentPage ?? 1)")
                case .novela:
                    if let characters = record.characters, characters > 0 {
                        Text("\(characters.formatted()) car.")
                    }
                }

                if let status = record.status {
                    Text(status.title)
                        .foregroundStyle(status == .completed ? .green : .secondary)
                }
            }
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}
