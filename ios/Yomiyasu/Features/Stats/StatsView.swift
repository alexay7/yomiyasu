import Charts
import SwiftUI

struct StatsView: View {
    @Environment(AppEnvironment.self) private var environment

    @State private var stats: UserStats?
    @State private var graphs: MonthlyGraphs?
    @State private var selectedVariant: Variant = .manga
    @State private var chartMode: ChartMode = .hours
    @State private var isLoading = true
    @State private var error: String?

    enum ChartMode: String, CaseIterable, Identifiable {
        case hours
        case speed

        var id: String { rawValue }

        var title: String {
            switch self {
            case .hours: "Horas"
            case .speed: "Velocidad"
            }
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                if let stats {
                    cards(stats)
                }

                chartSection
            }
            .padding()
        }
        .navigationTitle("Estadísticas")
        .overlay {
            if isLoading, stats == nil {
                ProgressView()
            } else if let error, stats == nil {
                ContentUnavailableView(
                    "No se pudo cargar",
                    systemImage: "wifi.exclamationmark",
                    description: Text(error)
                )
            }
        }
        .task {
            await load()
        }
        .refreshable {
            await load()
        }
        .onChange(of: environment.socket.libraryUpdatedAt) {
            Task { await load() }
        }
    }

    private func cards(_ stats: UserStats) -> some View {
        LazyVGrid(
            columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)],
            spacing: 12
        ) {
            StatCard(title: "Mangas leídos", value: stats.totalMangaBooks.formatted(), systemImage: "book")
            StatCard(title: "Novelas leídas", value: stats.totalNovelaBooks.formatted(), systemImage: "text.book.closed")
            StatCard(title: "Series de manga", value: stats.totalMangaSeries.formatted(), systemImage: "books.vertical")
            StatCard(title: "Series de novela", value: stats.totalNovelaSeries.formatted(), systemImage: "books.vertical.fill")
            StatCard(title: "Páginas leídas", value: stats.totalPagesRead.formatted(), systemImage: "doc.plaintext")
            StatCard(title: "Caracteres", value: stats.totalCharacters.formatted(), systemImage: "character.cursor.ibeam")
            StatCard(
                title: "Tiempo total",
                value: Int(stats.totalTimeRead * 60).durationText,
                systemImage: "clock"
            )
            StatCard(
                title: "Velocidad media",
                value: speedText(stats),
                systemImage: "speedometer"
            )
        }
    }

    private func speedText(_ stats: UserStats) -> String {
        guard stats.totalTimeRead > 0 else { return "—" }
        let charsPerHour = Double(stats.totalCharacters) / (stats.totalTimeRead / 60)
        return "\(Int(charsPerHour).formatted()) c/h"
    }

    @ViewBuilder
    private var chartSection: some View {
        let entries = graphEntries

        VStack(alignment: .leading, spacing: 12) {
            Text("Actividad mensual")
                .font(.headline)

            HStack {
                Picker("Contenido", selection: $selectedVariant) {
                    Text("Manga").tag(Variant.manga)
                    Text("Novelas").tag(Variant.novela)
                }
                .pickerStyle(.segmented)

                Picker("Métrica", selection: $chartMode) {
                    ForEach(ChartMode.allCases) { mode in
                        Text(mode.title).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
            }

            if entries.isEmpty {
                Text("Sin datos todavía.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 20)
            } else {
                Chart(entries) { entry in
                    switch chartMode {
                    case .hours:
                        BarMark(
                            x: .value("Mes", monthLabel(entry)),
                            y: .value("Horas", entry.totalHours)
                        )
                        .foregroundStyle(Color.accentColor)
                    case .speed:
                        LineMark(
                            x: .value("Mes", monthLabel(entry)),
                            y: .value("Caracteres/hora", entry.meanReadSpeed)
                        )
                        .foregroundStyle(Color.accentColor)

                        PointMark(
                            x: .value("Mes", monthLabel(entry)),
                            y: .value("Caracteres/hora", entry.meanReadSpeed)
                        )
                        .foregroundStyle(Color.accentColor)
                    }
                }
                .frame(height: 240)
                .chartYAxis {
                    AxisMarks(position: .leading)
                }
            }
        }
    }

    private var graphEntries: [MonthlyGraphEntry] {
        guard let graphs else { return [] }

        let entries = selectedVariant == .manga ? graphs.manga : graphs.novela

        return entries.sorted {
            ($0.monthID.year, $0.monthID.month) < ($1.monthID.year, $1.monthID.month)
        }
    }

    private func monthLabel(_ entry: MonthlyGraphEntry) -> String {
        let symbols = SpanishCalendar.monthShortSymbols
        let index = min(max(entry.monthID.month - 1, 0), symbols.count - 1)
        return "\(symbols[index]) \(String(entry.monthID.year % 100))"
    }

    private func load() async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            async let statsRequest = environment.progress.stats()
            async let graphsRequest = environment.progress.graphs()

            stats = try await statsRequest
            graphs = try await graphsRequest

            if let stats, stats.totalTimeRead > 0 {
                environment.settings.meanCharactersPerHour =
                    Double(stats.totalCharacters) / (stats.totalTimeRead / 60)
            }
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let systemImage: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: systemImage)
                .foregroundStyle(Color.accentColor)

            Text(value)
                .font(.title3.bold())
                .minimumScaleFactor(0.6)
                .lineLimit(1)

            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.secondary.opacity(0.12))
        )
    }
}

enum SpanishCalendar {
    static var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = Locale(identifier: "es_ES")
        calendar.firstWeekday = 2
        return calendar
    }

    static var monthSymbols: [String] { calendar.monthSymbols }
    static var monthShortSymbols: [String] { calendar.shortMonthSymbols }

    static var weekdayShortSymbols: [String] {
        let symbols = calendar.veryShortStandaloneWeekdaySymbols
        let firstWeekday = calendar.firstWeekday - 1
        return Array(symbols[firstWeekday...]) + Array(symbols[..<firstWeekday])
    }
}
