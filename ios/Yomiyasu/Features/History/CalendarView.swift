import SwiftUI

struct CalendarView: View {
    @Environment(AppEnvironment.self) private var environment

    @State private var monthAnchor = Date()
    @State private var streak: [Int: Int] = [:]
    @State private var selectedDay: Int?
    @State private var logs: [ProgressRecord] = []
    @State private var isLoading = true
    @State private var isLoadingLogs = false
    @State private var error: String?

    private let calendar = SpanishCalendar.calendar

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                monthHeader
                heatmap

                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding(.top, 20)
                } else if let error {
                    ContentUnavailableView(
                        "No se pudo cargar",
                        systemImage: "wifi.exclamationmark",
                        description: Text(error)
                    )
                } else if let selectedDay {
                    dayLogs(selectedDay)
                } else {
                    Text("Toca un día para ver sus lecturas.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 10)
                }
            }
            .padding()
        }
        .navigationTitle("Calendario")
        .task(id: monthKey) {
            await loadStreak()
        }
        .onChange(of: environment.socket.libraryUpdatedAt) {
            Task { await loadStreak() }
        }
    }

    private var monthComponents: (year: Int, month: Int) {
        let components = calendar.dateComponents([.year, .month], from: monthAnchor)
        return (components.year ?? 2026, components.month ?? 1)
    }

    private var monthKey: String {
        "\(monthComponents.year)-\(monthComponents.month)"
    }

    private var monthTitle: String {
        let index = min(max(monthComponents.month - 1, 0), SpanishCalendar.monthSymbols.count - 1)
        return "\(SpanishCalendar.monthSymbols[index].capitalized) \(monthComponents.year)"
    }

    private var monthHeader: some View {
        HStack {
            Button {
                shiftMonth(-1)
            } label: {
                Image(systemName: "chevron.left")
            }
            .accessibilityLabel("Mes anterior")

            Spacer()

            Text(monthTitle)
                .font(.headline)

            Spacer()

            Button {
                shiftMonth(1)
            } label: {
                Image(systemName: "chevron.right")
            }
            .accessibilityLabel("Mes siguiente")
        }
    }

    private var heatmap: some View {
        let days = daysInMonth
        let leadingEmpties = firstWeekdayOffset
        let maxCount = max(streak.values.max() ?? 1, 1)
        let columns = Array(repeating: GridItem(.flexible(), spacing: 6), count: 7)

        return VStack(spacing: 6) {
            HStack(spacing: 6) {
                ForEach(SpanishCalendar.weekdayShortSymbols, id: \.self) { symbol in
                    Text(symbol)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                }
            }

            LazyVGrid(columns: columns, spacing: 6) {
                ForEach(0..<leadingEmpties, id: \.self) { index in
                    Color.clear
                        .frame(height: 34)
                        .id("empty-\(index)")
                }

                ForEach(1...days, id: \.self) { day in
                    let count = streak[day] ?? 0

                    Button {
                        selectedDay = day
                        Task { await loadLogs(day: day) }
                    } label: {
                        Text("\(day)")
                            .font(.caption)
                            .frame(maxWidth: .infinity, minHeight: 34)
                            .background(cellColor(count: count, maxCount: maxCount))
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                            .overlay {
                                RoundedRectangle(cornerRadius: 6)
                                    .strokeBorder(
                                        selectedDay == day ? Color.accentColor : .clear,
                                        lineWidth: 2
                                    )
                            }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(
                        count > 0 ? "Día \(day), \(count) lecturas" : "Día \(day)"
                    )
                }
            }
        }
    }

    private func cellColor(count: Int, maxCount: Int) -> Color {
        guard count > 0 else {
            return Color.secondary.opacity(0.12)
        }

        let ratio = min(Double(count) / Double(maxCount), 1)
        return Color.accentColor.opacity(0.25 + 0.65 * ratio)
    }

    @ViewBuilder
    private func dayLogs(_ day: Int) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Día \(day)")
                .font(.headline)

            if isLoadingLogs {
                ProgressView()
            } else if logs.isEmpty {
                Text("Sin lecturas ese día.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(logs) { record in
                        LogRow(record: record)

                        if record.id != logs.last?.id {
                            Divider()
                        }
                    }
                }
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier("calendarLogs")
            }
        }
    }

    private var daysInMonth: Int {
        calendar.range(of: .day, in: .month, for: monthAnchor)?.count ?? 30
    }

    private var firstWeekdayOffset: Int {
        let components = calendar.dateComponents([.year, .month], from: monthAnchor)
        guard let firstOfMonth = calendar.date(from: components) else { return 0 }

        let weekday = calendar.component(.weekday, from: firstOfMonth)
        return (weekday - calendar.firstWeekday + 7) % 7
    }

    private func shiftMonth(_ delta: Int) {
        selectedDay = nil
        logs = []

        if let shifted = calendar.date(byAdding: .month, value: delta, to: monthAnchor) {
            monthAnchor = shifted
        }
    }

    private func loadStreak() async {
        isLoading = true
        error = nil
        selectedDay = nil
        logs = []
        defer { isLoading = false }

        do {
            let days = try await environment.progress.streak(
                year: monthComponents.year,
                month: monthComponents.month
            )
            streak = Dictionary(uniqueKeysWithValues: days.map { ($0.dayOfMonth, $0.count) })
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func loadLogs(day: Int) async {
        isLoadingLogs = true
        defer { isLoadingLogs = false }

        do {
            logs = try await environment.progress.logs(
                year: monthComponents.year,
                month: monthComponents.month,
                day: day
            )
        } catch {
            self.error = error.localizedDescription
        }
    }
}
