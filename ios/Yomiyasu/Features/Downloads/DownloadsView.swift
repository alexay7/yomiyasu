import SwiftUI

struct DownloadsView: View {
    @Environment(AppEnvironment.self) private var environment

    var body: some View {
        List {
            let active = environment.downloads.active

            if !active.isEmpty {
                Section("Descargando") {
                    ForEach(active) { item in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(item.name)
                                    .lineLimit(1)
                                Spacer()
                                Button {
                                    environment.downloads.cancel(item.bookId)
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .foregroundStyle(.secondary)
                                }
                                .buttonStyle(.borderless)
                                .accessibilityLabel("Cancelar descarga")
                            }

                            if item.isQueued {
                                Text("En cola")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            } else {
                                ProgressView(value: item.progress)
                                Text(item.detail)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }
            }

            let records = environment.downloads.sortedRecords

            if !records.isEmpty {
                Section {
                    ForEach(records) { record in
                        NavigationLink(value: BookRoute(id: record.bookId)) {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(record.visibleName)
                                    .lineLimit(2)
                                Text(subtitle(for: record))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .swipeActions {
                            Button("Borrar", role: .destructive) {
                                environment.downloads.delete(record.bookId)
                            }
                        }
                    }
                } header: {
                    Text("Descargados")
                } footer: {
                    Text(
                        "Total: \(ByteCountFormatter.string(fromByteCount: environment.downloads.totalBytes, countStyle: .file))"
                    )
                }
            }
        }
        .navigationTitle("Descargas")
        .overlay {
            if environment.downloads.active.isEmpty,
               environment.downloads.sortedRecords.isEmpty {
                ContentUnavailableView(
                    "Sin descargas",
                    systemImage: "arrow.down.circle",
                    description: Text("Descarga volúmenes desde una serie para leerlos sin conexión.")
                )
            }
        }
    }

    private func subtitle(for record: DownloadRecord) -> String {
        var parts: [String] = []

        if record.pageCount > 0 {
            parts.append("\(record.pageCount) páginas")
        }

        parts.append(ByteCountFormatter.string(fromByteCount: record.byteCount, countStyle: .file))
        parts.append(record.downloadedAt.formatted(date: .abbreviated, time: .shortened))

        return parts.joined(separator: " · ")
    }
}
