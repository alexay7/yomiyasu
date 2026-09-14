import SwiftUI

struct WordsView: View {
    @Environment(AppEnvironment.self) private var environment

    @State private var words: [UserWord] = []
    @State private var sort: WordsSort = .newest
    @State private var isLoading = true
    @State private var error: String?
    @State private var selectedWord: UserWord?
    @State private var pendingDelete: UserWord?

    var body: some View {
        List {
            ForEach(words) { word in
                Button {
                    selectedWord = word
                } label: {
                    WordRow(word: word)
                }
                .buttonStyle(.plain)
                .swipeActions {
                    Button("Borrar", role: .destructive) {
                        pendingDelete = word
                    }
                }
            }
        }
        .listStyle(.plain)
        .overlay {
            if isLoading && words.isEmpty {
                ProgressView()
            } else if let error, words.isEmpty {
                ContentUnavailableView(
                    "No se pudo cargar",
                    systemImage: "wifi.exclamationmark",
                    description: Text(error)
                )
            } else if words.isEmpty {
                ContentUnavailableView(
                    "Sin palabras guardadas",
                    systemImage: "character.book.closed",
                    description: Text("Guarda palabras desde el lector para repasarlas aquí.")
                )
            }
        }
        .navigationTitle("Palabras")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Picker("Orden", selection: $sort) {
                        ForEach(WordsSort.allCases) { option in
                            Text(option.title).tag(option)
                        }
                    }
                } label: {
                    Image(systemName: "arrow.up.arrow.down")
                }
                .accessibilityLabel("Ordenar")
            }
        }
        .task {
            await load()
        }
        .onChange(of: sort) {
            Task { await load() }
        }
        .refreshable {
            await load()
        }
        .confirmationDialog(
            "¿Borrar «\(pendingDelete?.word ?? "")»?",
            isPresented: Binding(
                get: { pendingDelete != nil },
                set: { if !$0 { pendingDelete = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Borrar", role: .destructive) {
                Task { await delete() }
            }
        }
        .sheet(item: $selectedWord) { word in
            NavigationStack {
                DictionaryLookupView(text: word.word, mode: .word)
                    .navigationTitle("Diccionario")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Cerrar") {
                                selectedWord = nil
                            }
                        }
                    }
            }
            .environment(environment)
        }
    }

    private func load() async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            words = try await environment.dictionary.words(sort: sort)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func delete() async {
        guard let word = pendingDelete else { return }
        pendingDelete = nil

        do {
            try await environment.dictionary.deleteWord(word.word)
            words.removeAll { $0.word == word.word }
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private struct WordRow: View {
    let word: UserWord

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                VStack(spacing: 0) {
                    if !word.reading.isEmpty, word.reading != word.word {
                        Text(word.reading)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    Text(word.word)
                        .font(.title3.bold())
                }

                Spacer()

                Text(word.frequencyLabel)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            if !word.pitch.isEmpty {
                PitchAccentView(reading: word.reading, pitchPositions: word.pitch)
            }

            Text(word.meaning.joined(separator: "; "))
                .font(.callout)
                .lineLimit(2)

            if !word.sentence.isEmpty {
                Text(highlightedSentence)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }
        }
        .padding(.vertical, 4)
    }

    private var highlightedSentence: AttributedString {
        var attributed = AttributedString(word.sentence)

        if let range = attributed.range(of: word.display) {
            attributed[range].backgroundColor = .yellow.opacity(0.3)
            attributed[range].font = .caption.bold()
        }

        return attributed
    }
}
