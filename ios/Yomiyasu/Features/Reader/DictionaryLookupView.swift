import SwiftUI

struct DictionaryLookupView: View {
    @Environment(AppEnvironment.self) private var environment

    let text: String
    let mode: DictionaryLookupMode

    @State private var displays: [DictionaryDisplay] = []
    @State private var selectedIndex = 0
    @State private var isLoading = true
    @State private var error: String?
    @State private var savedWordID: String?
    @State private var saveAlert: SaveAlert?

    private enum SaveAlert: Identifiable {
        case saved
        case duplicate
        case error(String)

        var id: String {
            switch self {
            case .saved: "saved"
            case .duplicate: "duplicate"
            case .error(let message): "error-\(message)"
            }
        }
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error {
                ContentUnavailableView(
                    "Error",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            } else if displays.isEmpty {
                ContentUnavailableView(
                    "Sin resultados",
                    systemImage: "character.book.closed",
                    description: Text("No se encontraron definiciones.")
                )
            } else {
                results
            }
        }
        .task {
            await lookup()
        }
        .alert(item: $saveAlert) { alert in
            switch alert {
            case .saved:
                Alert(title: Text("Palabra guardada"))
            case .duplicate:
                Alert(title: Text("Ya tienes esta palabra guardada"))
            case .error(let message):
                Alert(title: Text("No se pudo guardar"), message: Text(message))
            }
        }
    }

    private var results: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                if displays.count > 1 {
                    Picker("Resultado", selection: $selectedIndex) {
                        ForEach(displays.indices, id: \.self) { index in
                            Text(displays[index].display ?? "?")
                                .tag(index)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                let display = displays[min(selectedIndex, displays.count - 1)]

                if !text.isEmpty {
                    contextView(display: display)
                }

                ForEach(display.words) { word in
                    wordCard(word, display: display)
                }
            }
            .padding()
        }
        .accessibilityIdentifier("dictionaryResults")
    }

    private func contextView(display: DictionaryDisplay) -> some View {
        var attributed = AttributedString(text)

        if let token = display.display,
           let range = attributed.range(of: token) {
            attributed[range].backgroundColor = .yellow.opacity(0.35)
            attributed[range].font = .body.bold()
        }

        return Text(attributed)
            .font(.callout)
            .foregroundStyle(.secondary)
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.secondary.opacity(0.08))
            )
    }

    private func wordCard(_ word: DictionaryWord, display: DictionaryDisplay) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(word.headword)
                    .font(.title2.bold())

                if !word.mainReading.isEmpty, word.mainReading != word.headword {
                    Text(word.mainReading)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button {
                    Task { await save(word, display: display) }
                } label: {
                    Image(systemName: savedWordID == word.id ? "checkmark.circle.fill" : "bookmark")
                }
                .buttonStyle(.borderless)
                .disabled(savedWordID == word.id)
                .accessibilityLabel("Guardar palabra")
            }

            let otherKanji = (word.kanji ?? []).dropFirst().map(\.text)
            if !otherKanji.isEmpty {
                Text("Otras formas: \(otherKanji.joined(separator: ", "))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            let otherKana = (word.kana ?? []).dropFirst().map(\.text)
            if !otherKana.isEmpty {
                Text("Lecturas: \(otherKana.joined(separator: ", "))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 14) {
                if !word.pitchPositions.isEmpty {
                    PitchAccentView(
                        reading: word.mainReading,
                        pitchPositions: word.pitchPositions
                    )
                }

                if let rank = word.frequencyRank {
                    Text("Frecuencia: \(rank)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            if let senses = word.sense, !senses.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(Array(senses.prefix(3).enumerated()), id: \.offset) { index, sense in
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(index + 1). \((sense.gloss ?? []).map(\.text).joined(separator: "; "))")
                                .font(.body)

                            if let partOfSpeech = sense.partOfSpeech, !partOfSpeech.isEmpty {
                                Text(partOfSpeech.joined(separator: ", "))
                                    .font(.caption2)
                                    .foregroundStyle(.tertiary)
                            }
                        }
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.secondary.opacity(0.12))
        )
    }

    private func lookup() async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            switch mode {
            case .word:
                displays = try await environment.dictionary.lookupWord(text)
            case .sentence:
                displays = try await environment.dictionary.lookupSentence(text)
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func save(_ word: DictionaryWord, display: DictionaryDisplay) async {
        do {
            let request = UserWordRequest(
                word: word.headword,
                display: display.display ?? text,
                sentence: text,
                meaning: word.firstGlosses,
                reading: word.mainReading,
                frequency: Double(word.frequencyRank ?? 0),
                pitch: word.pitchPositions
            )

            let modified = try await environment.dictionary.saveWord(request)
            savedWordID = word.id
            saveAlert = modified == 0 ? .duplicate : .saved
        } catch {
            saveAlert = .error(error.localizedDescription)
        }
    }
}
