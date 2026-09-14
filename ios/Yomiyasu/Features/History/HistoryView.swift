import SwiftUI
import UIKit

struct HistoryView: View {
    @Environment(AppEnvironment.self) private var environment

    @State private var records: [ProgressRecord] = []
    @State private var total = 0
    @State private var page = 1
    @State private var sort: HistorySort = .recent
    @State private var isLoading = true
    @State private var isLoadingMore = false
    @State private var error: String?
    @State private var copiedRecordID: String?

    enum HistorySort: String, CaseIterable, Identifiable {
        case recent = "!lastUpdateDate"
        case oldest = "lastUpdateDate"
        case byBook = "book"
        case bySerie = "serie"

        var id: String { rawValue }

        var title: String {
            switch self {
            case .recent: "Recientes"
            case .oldest: "Más antiguos"
            case .byBook: "Por libro"
            case .bySerie: "Por serie"
            }
        }
    }

    private let pageSize = 50

    var body: some View {
        List {
            ForEach(records) { record in
                LogRow(record: record)
                    .contextMenu {
                        Button("Copiar .log", systemImage: "doc.on.doc") {
                            UIPasteboard.general.string = record.logLine
                            copiedRecordID = record.id
                        }
                        ShareLink(item: record.logLine)
                    }
                    .swipeActions {
                        ShareLink(item: record.logLine) {
                            Label("Compartir", systemImage: "square.and.arrow.up")
                        }
                        .tint(.blue)
                    }
                    .onAppear {
                        if record.id == records.last?.id {
                            Task { await loadMore() }
                        }
                    }
            }

            if isLoadingMore {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
            }
        }
        .listStyle(.plain)
        .navigationTitle("Historial")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Picker("Orden", selection: $sort) {
                        ForEach(HistorySort.allCases) { option in
                            Text(option.title).tag(option)
                        }
                    }
                } label: {
                    Image(systemName: "arrow.up.arrow.down")
                }
                .accessibilityLabel("Ordenar")
            }
        }
        .overlay {
            if isLoading && records.isEmpty {
                ProgressView()
            } else if let error, records.isEmpty {
                ContentUnavailableView(
                    "No se pudo cargar",
                    systemImage: "wifi.exclamationmark",
                    description: Text(error)
                )
            } else if records.isEmpty {
                ContentUnavailableView(
                    "Sin historial",
                    systemImage: "clock",
                    description: Text("Aquí aparecerá tu actividad de lectura.")
                )
            }
        }
        .overlay(alignment: .bottom) {
            if copiedRecordID != nil {
                Text("Copiado al portapapeles")
                    .font(.footnote)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(.ultraThinMaterial, in: Capsule())
                    .padding(.bottom, 12)
                    .transition(.opacity)
                    .task {
                        try? await Task.sleep(for: .seconds(2))
                        copiedRecordID = nil
                    }
            }
        }
        .task {
            await load(reset: true)
        }
        .onChange(of: sort) {
            Task { await load(reset: true) }
        }
        .refreshable {
            await load(reset: true)
        }
    }

    private func load(reset: Bool) async {
        if reset {
            page = 1
            isLoading = true
        } else {
            guard !isLoadingMore, records.count < total else { return }
            isLoadingMore = true
        }

        error = nil
        defer {
            isLoading = false
            isLoadingMore = false
        }

        do {
            let result = try await environment.progress.all(
                page: page,
                limit: pageSize,
                sort: sort.rawValue
            )

            if reset {
                records = result.records
            } else {
                records.append(contentsOf: result.records)
            }
            total = result.total
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func loadMore() async {
        guard records.count < total else { return }
        page += 1
        await load(reset: false)

        if error != nil {
            page -= 1
        }
    }
}
