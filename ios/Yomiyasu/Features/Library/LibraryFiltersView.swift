import SwiftUI

struct LibraryFiltersView: View {
    @Environment(\.dismiss) private var dismiss

    @Binding var query: SeriesQuery
    let genres: [String]
    let authors: [String]

    @State private var minDifficulty: Int
    @State private var maxDifficulty: Int

    private static let sortOptions: [(label: String, value: SortValue)] = [
        ("Título (A-Z)", SortValue(key: "sortName", descending: false)),
        ("Título (Z-A)", SortValue(key: "sortName", descending: true)),
        ("Añadidos recientemente", SortValue(key: "_id", descending: true)),
        ("Añadidos hace más tiempo", SortValue(key: "_id", descending: false)),
        ("Modificados recientemente", SortValue(key: "lastModifiedDate", descending: true)),
        ("Más volúmenes", SortValue(key: "bookCount", descending: true)),
        ("Menos volúmenes", SortValue(key: "bookCount", descending: false)),
        ("Dificultad (menor a mayor)", SortValue(key: "difficulty", descending: false)),
        ("Dificultad (mayor a menor)", SortValue(key: "difficulty", descending: true)),
    ]

    init(query: Binding<SeriesQuery>, genres: [String], authors: [String]) {
        _query = query
        self.genres = genres
        self.authors = authors
        _minDifficulty = State(initialValue: query.wrappedValue.minDifficulty ?? 0)
        _maxDifficulty = State(initialValue: query.wrappedValue.maxDifficulty ?? 10)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Orden") {
                    Picker("Ordenar por", selection: $query.sort) {
                        ForEach(Self.sortOptions, id: \.value) { option in
                            Text(option.label).tag(option.value)
                        }
                    }
                }

                Section("Estado") {
                    Picker("Estado", selection: $query.status) {
                        Text("Todas").tag(SerieStatus?.none)
                        ForEach(SerieStatus.allCases) { status in
                            Text(status.title).tag(SerieStatus?.some(status))
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section("Dificultad") {
                    Stepper("Mínima: \(minDifficulty)", value: $minDifficulty, in: 0...10)
                    Stepper("Máxima: \(maxDifficulty)", value: $maxDifficulty, in: 0...10)
                }

                Section("Género") {
                    Picker("Género", selection: $query.genre) {
                        Text("Cualquiera").tag(String?.none)
                        ForEach(genres, id: \.self) { genre in
                            Text(genre).tag(String?.some(genre))
                        }
                    }
                }

                Section("Autor") {
                    Picker("Autor", selection: $query.author) {
                        Text("Cualquiera").tag(String?.none)
                        ForEach(authors, id: \.self) { author in
                            Text(author).tag(String?.some(author))
                        }
                    }
                }

                Section("Progreso") {
                    Picker("Progreso", selection: readprogressBinding) {
                        ForEach(ProgressFilter.allCases) { filter in
                            Text(filter.title).tag(filter)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section {
                    Toggle("Solo series en mi lista", isOn: $query.readlistOnly)
                }

                Section {
                    Button("Restablecer filtros", role: .destructive) {
                        resetFilters()
                    }
                }
            }
            .navigationTitle("Filtros")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Aplicar") {
                        apply()
                    }
                }
            }
        }
    }

    private var readprogressBinding: Binding<ProgressFilter> {
        Binding(
            get: { query.readprogress ?? .all },
            set: { query.readprogress = $0 == .all ? nil : $0 }
        )
    }

    private func resetFilters() {
        query = SeriesQuery.resetFilters(query)
        minDifficulty = 0
        maxDifficulty = 10
    }

    private func apply() {
        if minDifficulty > maxDifficulty {
            maxDifficulty = minDifficulty
        }

        query.minDifficulty = minDifficulty > 0 ? minDifficulty : nil
        query.maxDifficulty = maxDifficulty < 10 ? maxDifficulty : nil
        dismiss()
    }
}
